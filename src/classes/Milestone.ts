import {COMMUNITY_ADDRESS, SIGNATURE_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {buffer2string, string2buffer} from "#lib/serde";
import {db, get_state_hash} from '#db';
import type Pack from "#classes/Pack";
import secp256k1 from "secp256k1";

export default class Milestone {
    private readonly sigs: Uint8Array[] = [];
    private readonly state_hash: Uint8Array;
    constructor(sigs?: string[], state_hash?: string) {
        if (!sigs && !state_hash)
            return this;
        this.sigs = sigs.map(x=>string2buffer(x, 'base64url'));
        this.state_hash = string2buffer(state_hash, 'hex');
    }
    binary(): Uint8Array{
        const sigs: number[] = this.sigs.reduce((acc: number[], cur): number[]=>{acc.push(...cur); return acc}, []);
        return new Uint8Array([TRANSITION_TYPES.MILESTONE, this.sigs.length-1, ...sigs, ...this.state_hash]);
    }
    json(): Transitions.Milestone{
        return {type: TRANSITION_TYPES.MILESTONE, sigs: this.sigs.map(x=>buffer2string(x, 'base64url')), state_hash: buffer2string(this.state_hash, 'hex')};
    }
    static from_binary(bin: Uint8Array): [Milestone, number] {
        const sigs: Uint8Array[] = [];
        if (bin[0] !== TRANSITION_TYPES.MILESTONE)
            throw new Error("Bad binary payload");
        const sig_count: number = bin[1] + 1;
        let offset: number = 2;
        if (bin.length < offset+SIGNATURE_BYTE_LENGTH*sig_count+32)
            throw new Error("Bad binary payload");
        for (let i=0;i<sig_count;i++)
            sigs.push(bin.slice(offset, offset+=SIGNATURE_BYTE_LENGTH));
        const state_hash: Uint8Array = bin.slice(offset, offset+=32);
        const ret: Milestone = new Milestone(sigs.map(x=>buffer2string(x, 'base64url')), buffer2string(state_hash, 'hex'));
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    private async is_valid(pack: Pack){
        const stabilizers: Map<string, bigint> = await db.get_stabilizers();
        if (!stabilizers.has(pack.r_author))
            return false;
        const stabilizer_pubkeys: Array<string> = await Promise.all([...stabilizers.keys()].filter(x=>x !== COMMUNITY_ADDRESS).map(x=>db.get_pubkey(x)));

        const signatures: Uint8Array[] = pack.r_milestone_transition.sigs;
        const state_hash: string = await get_state_hash();
        if (signatures.length !== stabilizer_pubkeys.length || !stabilizer_pubkeys.every(key=>signatures.some(sig=>secp256k1.ecdsaVerify(sig, new Uint8Array(string2buffer(state_hash, 'hex')), new Uint8Array(Buffer.from(key, 'hex'))))))
            return false;
    }
    async apply(pack: Pack) {
        const stabilizers: Map<string, bigint> = await db.get_stabilizers();
        if (stabilizers.has(pack.r_author)) //Only stabilizers can issue milestones
            db.put('milestone', pack.r_hash);
    }
}