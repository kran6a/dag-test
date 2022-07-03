import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, GENESIS_UNIT_HASH, MAX_CAP, TRANSITION_TYPES} from "#constants";
import {token2bin, binary2bigint, buffer2string, string2buffer} from "#lib/serde";
import {createHash} from "crypto";
import {db} from "#db";
import type Pack from "#classes/Pack";

const ALLOWED_BURNABLE_VALUES: Set<number> = new Set<number>([0, 1, 2, 3]);

export default class Token {
    readonly payload: ({cap: bigint, issuers: string[], burnable: boolean, nonce: number})[]; //token->amount
    constructor(payload: ({cap: bigint, issuers: string[], burnable: boolean, nonce: number})[]) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        return new Uint8Array(this.payload.reduce((acc: number[], token)=>acc.concat(Array.from(token2bin(token))), [TRANSITION_TYPES.DEFINE_TOKEN, this.payload.length -1]));
    }
    json(): {type: TRANSITION_TYPES.DEFINE_TOKEN, tokens: {cap: bigint, issuers: string[], burnable: boolean}[]}{
        return {type: TRANSITION_TYPES.DEFINE_TOKEN, tokens: this.payload};
    }
    add(token: {cap: bigint, issuers: string[], burnable: boolean, nonce: number}): Token{
        this.payload.push(token);
        return this;
    }
    static from_binary(bin: Uint8Array): [Token, number]{
        const ret: Token = new Token([]);
        if (bin[0] !== TRANSITION_TYPES.DEFINE_TOKEN)
            throw new Error("Bad binary payload");
        const entry_count: number = bin[1] +1;
        if (entry_count === undefined)
            throw new Error("Bad binary payload");
        let offset: number = 2;
        const read_nonces: number[] = [];
        for (let i=0;i<entry_count;i++){
            const raw_burnable: number = bin[offset++];
            if (!ALLOWED_BURNABLE_VALUES.has(raw_burnable)) //Bad burnable byte
                throw new Error("Bad binary payload");
            const burnable: boolean = raw_burnable < 2;
            const is_cap_explicit: boolean = raw_burnable === 0 || raw_burnable === 2;
            if (bin.length < offset+BALANCE_WIDTH_BYTES)
                throw new Error("Bad binary payload");
            const cap: bigint = is_cap_explicit ? binary2bigint(bin.slice(offset, offset+=BALANCE_WIDTH_BYTES)) + 1n : MAX_CAP;
            const issuers: string[] = [];
            const issuer_count: number = bin[offset++] +1;
            if (bin.length < offset+ADDRESS_BYTE_LENGTH*issuer_count)
                throw new Error("Bad binary payload");
            for (let i=0;i<issuer_count;i++){
                const issuer: string = buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
                if (issuers.includes(issuer))   //Duplicated issuers
                    throw new Error("Bad binary payload");
                issuers.push(issuer);
            }
            const nonce: number = bin[offset++];
            if (read_nonces.includes(nonce)) //Duplicated nonces
                throw new Error("Bad binary payload");
            read_nonces.push(nonce);
            ret.add({cap, burnable, issuers, nonce});
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    static async compute_hash(pack: Pack, nonce: number): Promise<string>{
        return buffer2string(new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array([
            ...string2buffer('token_', 'utf8'),
            ...string2buffer(pack.r_hash, 'base64url'),
            ...string2buffer('_', 'utf8'),
            nonce
        ]))), 'base64url');
    }
    apply(pack: Pack): void{
        this.payload.forEach((token)=>{
            const hash: Uint8Array = pack.r_hash === GENESIS_UNIT_HASH
                ? createHash('sha256').update('token_', 'utf8').update(GENESIS_UNIT_HASH, 'base64url').digest()
                : createHash('sha256').update('token_', 'utf8')
                .update(pack.r_hash, 'base64url')
                .update('_', 'utf8')
                .update(new Uint8Array([token.nonce]))
                .digest();
            db.put(buffer2string(hash, 'binary'), buffer2string(new Uint8Array(token2bin(token)), 'binary'));
        });
    }
}