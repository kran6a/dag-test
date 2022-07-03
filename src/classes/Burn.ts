import {BALANCE_WIDTH_BYTES, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {bigint2word, binary2bigint, buffer2string, string2buffer} from "#lib/serde";
import {db} from '#db';
import type Pack from '#classes/Pack';

export default class Burn {
    readonly payload: Record<string, bigint>; //token->amount
    constructor(payload: Record<string, bigint>) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        return new Uint8Array(Object.entries(this.payload).reduce((acc: number[], [token, amount])=>[
            ...acc,
            ...string2buffer(token, 'base64url'),
            ...bigint2word(amount -1n)
        ], [TRANSITION_TYPES.BURN_TOKEN, Object.entries(this.payload).length -1]));
    }
    json(): Transitions.Token_Burn{
        return {type: TRANSITION_TYPES.BURN_TOKEN, burn: Object.fromEntries(Object.entries(this.payload).map(([address, amount])=>[address, amount.toString()+'n']))};
    }
    sum(token: string): bigint {
        return this.payload[token] || 0n;
    }
    add(token: string, amount: bigint): Burn{
        if (!this.payload[token]) {
            this.payload[token] = amount;
            return this;
        }
        this.payload[token] += amount;
        return this;
    }
    sub(token: string, amount: bigint): Burn {
        if (!this.payload[token])
            return this;
        this.payload[token] -= amount;
        if (this.payload[token] === 0n)
            delete this.payload[token];
        return this;
    }
    static from_binary(bin: Uint8Array): [Burn, number] {
        const ret: Burn = new Burn({});
        if (bin[0] !== TRANSITION_TYPES.BURN_TOKEN)
            throw new Error("Bad binary payload");
        const token_count: number = bin[1] +1;
        let offset: number = 2;
        if (bin.length < offset + token_count*(TOKEN_BYTE_LENGTH + BALANCE_WIDTH_BYTES)) //Not enough bytes to read
            throw new Error("Bad binary payload");
        for (let i=0;i<token_count;i++){
            const token: string = buffer2string(bin.slice(offset, offset+=TOKEN_BYTE_LENGTH), 'base64url');
            const amount: bigint = binary2bigint(bin.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n;
            ret.add(token, amount);
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    async apply(pack: Pack){
        if (!await this.is_valid(pack))
            return;
        await Promise.all(Object.entries(this.payload).map(async ([token_hash, amount])=>{
            const [old_balance, old_supply]: [bigint, bigint] = await Promise.all([db.get_balance(pack.r_author, token_hash), db.get_supply(token_hash)]);
            db.set_balance(pack.r_author, token_hash, old_balance - amount);
            db.set_supply(token_hash, old_supply - amount);
        }));
    }
    private async is_valid(pack: Pack) {
        const token_hashes: string[] = Object.keys(this.payload);
        const tokens: Option<{ hash: string, cap: bigint, burnable: boolean, issuers: string[], supply: bigint }>[] = await Promise.all(token_hashes.map(x=>db.get_token(x)));
        if (tokens.some(x=>x.err))
            return false;
        if (!tokens.every(x=>x?.ok?.issuers.includes(pack.r_author) && x.ok.burnable)) //Author must be an issuer and the token must be burnable
            return false;
        const amounts: bigint[] = Object.values(this.payload);
        const balances: bigint[] = await Promise.all(tokens.map(x=>db.get_balance(pack.r_author, x.ok.hash)));
        return balances.every((x, i)=>x >= amounts[i]);

    }
}