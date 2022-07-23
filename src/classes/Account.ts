import {EMPTY_BUFFER, PUBKEY_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {buffer2string, string2buffer} from "#lib/serde";
import {db} from '#db';

export default class Account {
    private readonly pubkeys: string[];
    constructor(pubkeys: string[]) {
        this.pubkeys = pubkeys;
    }
    binary(): Uint8Array{
        if (this.pubkeys.length === 0)
            return EMPTY_BUFFER;
        return new Uint8Array([TRANSITION_TYPES.ACCOUNT, this.pubkeys.length - 1, ...this.pubkeys.reduce((acc: number[], cur): number[]=>{acc.push(...string2buffer(cur, 'hex')); return acc}, [])]);
    }
    json(): Transitions.Account {
        return {type: TRANSITION_TYPES.ACCOUNT, pubkeys: this.pubkeys};
    }
    add(pubkey: string): Account {
        this.pubkeys.push(pubkey);
        return this;
    }
    static from_binary(bin: Uint8Array): [Account, number] {
        const ret: Account = new Account([]);
        if (bin.length < 2+PUBKEY_BYTE_LENGTH)
            throw new Error("Bad binary payload", {cause: new Error("Binary length is shorter than the minimal amount of bytes needed to store a single account")});
        if (bin[0] !== TRANSITION_TYPES.ACCOUNT)
            throw new Error("Bad binary payload", {cause: new Error('Attempted to instantiate an Account transition with an invalid transition byte')});
        const pubkey_count: number = bin[1] + 1;
        let offset: number = 2;
        if (bin.length < offset+pubkey_count*PUBKEY_BYTE_LENGTH) //Payload without metadata must be a multiple of the pubkey length
            throw new Error("Bad binary payload", {cause: new Error("The length of a payload stripped out of metadata must be a multiple of the length of a single pubkey")});
        for (let i=0;i<pubkey_count;i++) {
            const pubkey: string = buffer2string(bin.slice(offset, offset+=PUBKEY_BYTE_LENGTH), 'hex');
            if (ret.pubkeys.includes(pubkey)) //Pubkeys must be unique
                throw new Error("Bad binary payload", {cause: new Error("Duplicated pubkeys")});
            ret.add(pubkey);
        }
        ret.binary = ()=>bin.slice(0, offset);
        return [ret, offset];
    }
    apply(){
        this.pubkeys.forEach(x=>db.set_pubkey(x));
    }
}