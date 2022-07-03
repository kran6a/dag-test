// noinspection DuplicatedCode

import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, EMPTY_BUFFER, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {bigint2word, buffer2string, binary2bigint, string2buffer} from "#lib/serde";
import {db} from "#db";
import type Pack from "#classes/Pack";

export default class Payment {
    readonly payload: Record<string, Record<string, bigint>>;//token->address->bigint
    constructor(payload: Record<string, Record<string, bigint>> = {}) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        if (Object.entries(this.payload).length === 0)
            return EMPTY_BUFFER;
        return new Uint8Array(Object.entries(this.payload).reduce((acc, [token, address_amount])=>{
            acc.push(
                ...string2buffer(token === 'base' ? BASE_TOKEN : token, 'base64url'), //Token 32B
                Object.entries(address_amount).length -1, //outputs 1B, 0x00 means 1 output
                ...Object.entries(address_amount).reduce((acc: number[], [address, amount]: [string, bigint])=>[...acc, ...string2buffer(address, 'hex'), ...bigint2word(amount - 1n)], [])
            );
            return acc;
        }, [TRANSITION_TYPES.PAYMENT, Object.entries(this.payload).length -1]));
    }
    static from_binary(bin: Uint8Array): [Payment, number]{
        const ret: Payment = new Payment({});
        if (bin[0] !== TRANSITION_TYPES.PAYMENT)
            throw new Error("Bad binary payload");
        const token_count: number = bin[1] + 1;
        let offset: number = 2;
        if (token_count === undefined)
            throw new Error("Bad binary payload");
        for (let i=0;i<token_count;i++){
            if (bin.length < offset+TOKEN_BYTE_LENGTH+1)
                throw new Error("Bad binary payload");
            const token: string = buffer2string(bin.slice(offset, offset+=TOKEN_BYTE_LENGTH), 'base64url');
            if (Object.keys(ret.payload).includes(token)) //Duplicate token
                throw new Error("Bad binary payload");
            const payment_count: number = bin[offset++] + 1;
            if (bin.length < offset+(ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES)*payment_count)
                throw new Error("Bad binary payload");
            for (let i=0;i<payment_count;i++){
                const address_amount: Uint8Array = bin.slice(offset, offset+=(ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES));
                const address: string = buffer2string(address_amount.slice(0, ADDRESS_BYTE_LENGTH), 'hex');
                if (Object.keys(ret.payload[token] || {}).includes(address)) //Duplicate payment
                    throw new Error("Bad binary payload");
                const amount: Uint8Array = address_amount.slice(-BALANCE_WIDTH_BYTES);
                ret.add(address, token, binary2bigint(amount)+1n);
            }
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    json(): Record<string, Record<string, bigint>>{
        return this.payload;
    }
    count(): number{
        return Object.entries(this.payload).reduce((acc, cur)=>acc+Object.entries(cur).length, 0);
    }
    sum(token: string = BASE_TOKEN): bigint {
        if (!this.payload[token])
            return 0n;
        return Object.entries(this.payload[token]).reduce((acc, [address, amount])=>acc + amount, 0n);
    }
    add(address: string, token: string, amount: bigint): Payment{
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
    sub(address: string, token: string, amount: bigint): Payment {
        if (!this.payload[token] || !this.payload[token][address])
            return this;
        this.payload[token][address] -= amount;
        if (this.payload[token][address] === 0n)
            delete this.payload[token][address];
        return this;
    }
    apply(pack: Pack): Promise<void>{
        return <Promise<void>><unknown>Promise.all(Object.entries(this.payload).map(async ([token, address_amount])=>{
            for (const [address, amount] of Object.entries(address_amount)) {
                if (pack.r_author === address || amount === 0n) //Shortcut. VM may create these.
                    return;
                const [sender_balance, receiver_balance]: [bigint, bigint] = await Promise.all([db.get_balance(<string>pack.r_author, token), db.get_balance(address, token)]);
                if (sender_balance < amount)
                    return;
                db.set_balance(<string>pack.r_author, token, sender_balance - amount);
                db.set_balance(address, token, receiver_balance + amount);
            }
        }));
    }

    to_address(address: string) {
        const ret: Map<string, bigint> = new Map<string, bigint>;
        Object.keys(this.payload).forEach(token=>{
            if (this.payload[token][address])
                ret.set(token, this.payload[token][address]);
        });
        return ret;
    }
}