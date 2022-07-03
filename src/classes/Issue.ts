// noinspection DuplicatedCode

import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {bigint2word, binary2bigint, buffer2string, string2buffer} from "#lib/serde";
import {db} from "#db";
import type Pack from "#classes/Pack";

export default class Issue {
    private readonly payload: Record<string, Record<string, bigint>>;
    constructor(payload: Record<string, Record<string, bigint>>) {
        this.payload = structuredClone(payload);
    }
    binary(): Uint8Array{
        return new Uint8Array(Object.entries(this.payload).reduce((acc, [token, address_amount])=>{
            acc.push(
                ...string2buffer(token, 'base64url'), //Token
                Object.entries(address_amount).length - 1, //Receivers of that token 0x00 byte means 1 receiver
                ...Object.entries(address_amount)
                .filter(x=>x[1] !== 0n)
                .reduce((acc: number[], [address, amount])=>[
                    ...acc,
                    ...string2buffer(address, 'hex'),
                    ...bigint2word(amount -1n, BALANCE_WIDTH_BYTES)
                ], [])
            );
            return acc;
        }, [TRANSITION_TYPES.ISSUE, Object.entries(this.payload).length -1]));
    }
    json(): {type: TRANSITION_TYPES.ISSUE, issue: Record<string, Record<string, string>>}{
        return {type: TRANSITION_TYPES.ISSUE, issue: Object.fromEntries(Object.entries(this.payload).map(([token, address_amount])=>[token, Object.fromEntries(Object.entries(address_amount).map(([address, amount])=>[address, amount.toString()+'n']))]))}
    }
    count(): number{
        return Object.entries(this.payload).reduce((acc, cur)=>acc+Object.entries(cur).length, 0);
    }
    sum(token: string = BASE_TOKEN): bigint {
        if (!this.payload[token])
            return 0n;
        return Object.entries(this.payload[token]).reduce((acc, [_address, amount])=>acc + amount, 0n);
    }
    add(address: string, token: string, amount: bigint): Issue{
        if (!this.payload[token]) {
            this.payload[token] = {[address]: amount};
            return this;
        }
        if (!this.payload[token][address]) {
            this.payload[token][address] = amount;
            return this;
        }
        this.payload[token][address] += amount;
        return this;
    }
    sub(address: string, token: string, amount: bigint): Issue {
        if (!this.payload[token] || !this.payload[token][address])
            return this;
        this.payload[token][address] -= amount;
        if (this.payload[token][address] === 0n)
            delete this.payload[token][address];
        return this;
    }

    static from_binary(bin: Uint8Array): [Issue, number] {
        const ret: Issue = new Issue({});
        if (bin[0] !== TRANSITION_TYPES.ISSUE)
            throw new Error("Bad binary payload");
        const token_count: number = bin[1] + 1;
        let offset: number = 2;
        for (let i=0;i<token_count;i++){
            if (bin.length < offset+TOKEN_BYTE_LENGTH+1) //Not enough bytes left to encode a token + entry_count
                throw new Error("Bad binary payload");
            const token: string = buffer2string(bin.slice(offset, offset+=TOKEN_BYTE_LENGTH), 'base64url');
            const entry_count: number = bin[offset++] + 1;
            if (bin.length < offset+(ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES)*entry_count) //Not enough bytes left to encode the amount of entries stated on ebtry_count
                throw new Error("Bad binary payload");
            for (let i=0;i<entry_count;i++){
                const address: string = buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
                const amount: bigint = binary2bigint(bin.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n;
                ret.add(address, token, amount);
            }
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    async apply(pack: Pack): Promise<void>{
        const is_valid: boolean = await this.is_valid(pack);
        if (!is_valid)
            return;
        await Promise.all(Object.entries(this.payload).map(async ([token, address_amount])=>{
            for (const [address, amount] of Object.entries(address_amount)){
                const [old_supply, old_balance]: [bigint, bigint] = await Promise.all([db.get_supply(token), db.get_balance(address, token)]);
                db.set_supply(token, old_supply + amount);
                db.set_balance(address, token, old_balance + amount);
            }
        }));
    }
    private async is_valid(pack: Pack) {
        const token_hashes: string[] = Object.keys(this.payload);
        const tokens: Option<{ hash: string, cap: bigint, burnable: boolean, issuers: string[], supply: bigint }>[] = await Promise.all(token_hashes.map(x=>db.get_token(x)));
        if (tokens.some(x=>x.err))
            return false;
        if (!tokens.every(x=>x?.ok?.issuers?.includes(pack.r_author))) //Author must be an issuer and the token must be burnable
            return false;
        const amounts: Map<string, bigint> = Object.entries(this.payload).reduce((acc: Map<string, bigint>, [hash, address_amount])=>{
            Object.values(address_amount).forEach((x)=>{
                const current_value: bigint = acc.get(hash) ?? 0n;
                acc.set(hash, current_value + x);
            });
            return acc;
        }, new Map<string, bigint>);
        const supplies: Map<string, bigint> = (await Promise.all(tokens.map(x=>db.get_supply((<{hash: string}>x.ok).hash)))).reduce((acc, cur, i)=>{
            return acc.set((<{hash: string}>tokens[i].ok).hash, cur);
        }, new Map<string, bigint>());
        return [...supplies.entries()].every(([hash, supply], i)=>{
            return supply + <bigint>amounts.get((<{hash: string}>tokens[i].ok).hash) <= (<{cap: bigint}>tokens[i].ok).cap;
        });
    }
}