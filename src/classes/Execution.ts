import {ADDRESS_BYTE_LENGTH, BASE_TOKEN, COMMUNITY_ADDRESS, MAX_VM_GAS_PER_CALL, TRANSITION_TYPES} from "#constants";
import {buffer2string, dop2int, int2dop, int2trop, string2buffer, trop2int} from "#lib/serde";
import {is_err, is_smart_contract_known} from "#lib/validation";
import {db} from "#db";
import type Pack from "#classes/Pack";
import {EXCEPTIONS, Vm} from "#vm";
import Payment from "#classes/Payment";

export default class Execution {
    private readonly payload: Record<string, Uint8Array[]>; //Address->params
    private gas_limit: number;
    constructor(payload: Record<string, { params: Uint8Array[], gas_limit: number }>) {
        this.payload = Object.fromEntries(Object.entries(payload).map(([k ,v])=>[k, v.params]));
        this.gas_limit = Math.max(...Object.values(payload).map(x=>x.gas_limit));
    }
    binary(): Uint8Array{
        return new Uint8Array(Object.entries(this.payload).reduce((acc: number[], [address, params])=>[
            ...acc,
            ...string2buffer(address, 'hex'),
            params.length -1, //Number of calls to a given smart contract
            ...params.reduce((acc, param)=>[
                ...acc,
                ...int2dop(param.length),//Param length
                ...param //Param
            ], <number[]>[]),
        ], [
            TRANSITION_TYPES.EXECUTE,
            Object.keys(this.payload).length -1, //Number of smart contract called
            ...int2trop(this.gas_limit -1)
        ]));
    }
    json(): {type: TRANSITION_TYPES.EXECUTE, calls: Record<string, Uint8Array[]>, gas_limit: number }{
        return {type: TRANSITION_TYPES.EXECUTE, calls: this.payload, gas_limit: this.gas_limit};
    }
    add(address: string, params: Uint8Array[], gas_limit: number): Execution{
        this.payload[address] = params;
        this.gas_limit = Math.max(this.gas_limit || 0, gas_limit);
        return this;
    }

    //TODO this may be wrong which would create a difficult to catch bug since from_binary is only called for packs received from the network
    static from_binary(bin: Uint8Array): [Execution, number] {
        const ret: Execution = new Execution({});
        if (bin.length < 2 + ADDRESS_BYTE_LENGTH+3) //Lacks type byte, smart_contract_count, calls no smart contract or did not set the gas_limit
            throw new Error("Bad binary payload");
        if (bin[0] !== TRANSITION_TYPES.EXECUTE)
            throw new Error("Bad binary payload");
        const smart_contract_count: number = bin[1] + 1; //Add one so that we can fit 256 calls instead of 256 (byte zero means 1 call, byte 255 means 256 calls)
        let offset: number = 2;
        if (bin.length <= offset+3)
            throw new Error("Bad binary payload");
        const gas_limit: number = trop2int(bin.slice(offset, offset+=3)) + 1; //the 0x00 byte means 1 gas limit
        for (let i=0;i<smart_contract_count;i++){
            if (bin.length < offset+ADDRESS_BYTE_LENGTH) //Check that we can read the smart contract address and call_count
                throw new Error("Bad binary payload");
            const address: string = buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
            if (bin.length < offset+3)
                throw new Error("Bad binary payload");
            const call_count: number = bin[offset++] +1;
            const params: Uint8Array[] = [];
            for (let i=0;i<call_count;i++){
                if (bin.length < offset+2) //Check that we can read the dop encoding the parameter length for this call
                    throw new Error("Bad binary payload");
                const param_length: number = dop2int(bin.slice(offset, offset+=2));
                if (bin.length < offset+param_length) //param_length is larger than the remaining payload
                    throw new Error("Bad binary payload");
                const param: Uint8Array = bin.slice(offset, offset+=param_length);
                params.push(param);
            }
            ret.add(address, params, gas_limit);
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    async apply(pack: Pack): Promise<void> {
        const SENDER_BASE_BALANCE: bigint = await db.get_balance(<string>pack.r_author, BASE_TOKEN);
        if (BigInt(this.gas_limit) > SENDER_BASE_BALANCE)
            return;
        if (this.gas_limit > MAX_VM_GAS_PER_CALL)
            return;
        //Whether we do not know some smart contract. We could do the check concurrently
        const failed: boolean = await Object.entries((<Execution>pack.r_execution).payload).reduce(async (acc, [address, _])=>{
            return acc.then(async x=>{
                if (x)
                    return true;
                return !await is_smart_contract_known(address);
            });
        }, new Promise<boolean>(resolve=>resolve(false)));
        if (failed)
            return;
        let gas_limit: number = this.gas_limit;
        pack.pay(COMMUNITY_ADDRESS, BASE_TOKEN, BigInt(gas_limit)) //TODO would users be ok with financing the community fund with this? otherwise send this to stabilizers or return to sender
        const to_apply: Pack[] = [];
        for (const [address, params] of Object.entries(this.payload)) {
            const code: Uint8Array = await db.get_smart_contract(address);
            const inputs: Map<string, bigint> = (<Payment>pack.r_payment).to_address(address);
            const vm: Vm = new Vm(code, <string>pack.r_author, gas_limit, params, inputs);
            const result: Option<Uint8Array, EXCEPTIONS> = await vm.execute(true);
            gas_limit -= vm.gas;
            //TODO this if is untested
            if (gas_limit < 0){
                to_apply.length = 0; //fast array deletion
                break;
            }
            if (is_err(result))
                continue;
            if (vm.output)
                to_apply.push(vm.output);
        }
        if (to_apply.length > 0)
            for (const tx of to_apply)
                await tx.apply();
    }
}