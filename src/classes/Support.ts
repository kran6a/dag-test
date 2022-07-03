import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, TRANSITION_TYPES} from "#constants";
import {bigint2word, binary2bigint, buffer2string, fromJSON, string2buffer, toJSON} from "#lib/serde";
import {db} from "#db";
import type Pack from "#classes/Pack";

export default class Support {
    readonly payload: Record<string, bigint>;
    constructor(payload: Record<string, bigint>) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        return new Uint8Array(Object.entries(this.payload).reduce((acc, [address, amount])=>{
            return [...acc, amount >= 0 ? 1 : 0, ...string2buffer(address, 'hex'), ...bigint2word(amount>=0n ? amount -1n: amount*-1n-1n)];
        }, [TRANSITION_TYPES.SUPPORT, Object.entries(this.payload).length -1]));
    }
    json(): Transitions.Stabilizer_Support{
        return {type: TRANSITION_TYPES.SUPPORT, support: Object.fromEntries(Object.entries(this.payload).map(([address, amount])=>[address, amount.toString()+'n']))};
    }
    sum(): bigint {
        return Object.entries(this.payload).reduce((acc, [address, amount])=>acc + amount, 0n);
    }
    add(address: string, amount: bigint): Support{
        if (!this.payload[address]) {
            this.payload[address] = amount;
            return this;
        }
        this.payload[address] += amount;
        return this;
    }
    sub(address: string, amount: bigint): Support {
        if (!this.payload[address])
            return this;
        this.payload[address] -= amount;
        if (this.payload[address] === 0n)
            delete this.payload[address];
        return this;
    }

    static from_binary(bin: Uint8Array): [Support, number] {
        const ret: Support = new Support({});
        if (bin.length < 2+ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES)
            throw new Error("Bad binary payload");
        if (bin[0] !== TRANSITION_TYPES.SUPPORT)
            throw new Error("Bad binary payload");
        const entry_count: number = bin[1] + 1;
        const entry_size: number = ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES+1;
        const last_offset: number = entry_count * entry_size;
        if (bin.length < last_offset) //Payload without metadata must be a multiple of entry size and greater or equal to the expected max offset
            throw new Error("Bad binary payload");
        let offset: number = 2;
        while (offset < last_offset){
            const sign: number = bin[offset++];
            if (sign > 1)
                throw new Error("Bad binary payload", {cause: new Error("Sign must be 0 for unstaking and 1 for staking")});
            const address: string = buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
            let amount: bigint = binary2bigint(bin.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n;
            if (sign === 0)
                amount*=-1n;
            ret.add(address, amount);
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    async apply(pack: Pack): Promise<void> {
        const total: bigint = Object.values(this.payload).reduce((acc, cur)=>acc + cur, 0n);
        const balance: bigint = await db.get_balance(pack.r_author, BASE_TOKEN);
        if (balance < total)
            return;
        await Promise.all(Object.entries(this.payload).map(async ([address, delta])=>{
            const supporter_balance: bigint = await db.get_balance(pack.r_author, BASE_TOKEN);
            const staked: bigint = await db.get_staked_by_to(pack.r_author, address);
            if (delta > 0n && supporter_balance < delta) //Cannot stake so much
                return;
            else if (staked + delta < 0n) //Cannot unstake so much
                return;

            const support: bigint = await db.get_support(address);
            db.set_staked_to(pack.r_author, address, staked + delta);//Update supporter amount
            db.set_support(address, support + delta);    //Update supportee amount
            db.set_balance(pack.r_author, BASE_TOKEN, supporter_balance-delta);

            const new_support: bigint = support + delta;

            //Check if the new candidate just kicked a stabilizer
            const stabilizers: {address: string, support: bigint}[] = (<{address: string, support: bigint}[]>fromJSON(await db.get('stabilizers'))).sort((a, b)=> a.support > b.support ? 1 : -1);
            const is_a_stabilizer: boolean = stabilizers.some(x=>x.address === address);
            if (!is_a_stabilizer && new_support > stabilizers[0].support) { //Stabilizer kicked
                stabilizers[0] = {address, support: new_support};
                db.put('stabilizers', toJSON(stabilizers));
            }
            else if (is_a_stabilizer) {
                stabilizers[stabilizers.findIndex(x=>x.address === address)].support += delta;
                db.put('stabilizers', toJSON(stabilizers));
            }
        }));
    }
}