import {TRANSITION_TYPES} from "#constants";
import {int2qop, qop2int} from "#lib/serde";
import {db} from "#db";
import {createHash} from "crypto";

export default class Dapp {
    private readonly payload: Uint8Array[];
    constructor(payload: Uint8Array[]) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        return new Uint8Array(this.payload.reduce((acc: number[], code)=>[...acc, ...int2qop(code.length -1), ...code], [TRANSITION_TYPES.CREATE_DAPP, this.payload.length -1]));
    }
    json(): Transitions.Dapp{
        return {type: TRANSITION_TYPES.CREATE_DAPP, codes: this.payload.map((x)=>Array.from(x))};
    }
    add(code: Uint8Array): Dapp{
        this.payload.push(code);
        return this;
    }

    static from_binary(bin: Uint8Array): [Dapp, number] {
        const ret: Dapp = new Dapp([]);
        if (bin[0] !== TRANSITION_TYPES.CREATE_DAPP)
            throw new Error("Bad binary payload");
        const entry_count: number = bin[1]+1;
        let offset: number = 2;
        let codes_read: number = 0;
        while (codes_read < entry_count){
            const code_size: number = qop2int(bin.slice(offset, offset+=4))+1;
            if (bin.length < offset+code_size) //Code size is greater than the remaining payload
                throw new Error("Bad binary payload");
            const code: Uint8Array = bin.slice(offset, offset+=code_size);
            ret.payload.push(code);
            codes_read++;
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    static compute_address(bin: Uint8Array | number[]): string{
        return createHash('sha256').update('sca_', 'utf8').update(new Uint8Array(bin)).digest('hex');
    }
    apply(){
        this.payload.forEach(code=>db.set_smart_contract(code));
    }
}