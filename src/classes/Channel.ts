import {TRANSITION_TYPES} from "#constants";
import {buffer2string, dop2int, int2dop, int2trop, string2buffer, trop2int} from "#lib/serde";
import {db} from "#db";
import type Pack from "#classes/Pack";
import {createHash} from "crypto";

export default class Channel {
    readonly payload: Record<string, string>; //key->value
    constructor(payload: Record<string, string>) {
        this.payload = payload;
    }
    binary(): Uint8Array{
        return new Uint8Array(Object.entries(this.payload).reduce((acc: number[], [key, value])=>{
            const key_bin: Uint8Array = string2buffer(key, 'utf8');
            const value_bin: Uint8Array = string2buffer(value, 'utf8');
            const key_length: number = key_bin.length;
            const value_length: number = value_bin.length;
            return [...acc, ...int2dop(key_length-1), ...key_bin, ...int2trop(value_length-1), ...value_bin];
        }, [TRANSITION_TYPES.UPDATE_CHANNEL, Object.entries(this.payload).length-1]));
    }
    json(): Record<string, string>{
        return this.payload;
    }
    add(key: string, value: string): Channel{
        this.payload[key] = value;
        return this;
    }
    sub(key: string){
        delete this.payload[key];
        return this;
    }

    static from_binary(bin: Uint8Array): [Channel, number] {
        const ret: Channel = new Channel({});
        if (bin[0] !== TRANSITION_TYPES.UPDATE_CHANNEL)
            throw new Error("Bad binary payload");
        const entry_count: number = bin[1]+1;
        let offset: number = 2;
        for (let i=0;i<entry_count;i++){
            const key_length: number = dop2int(bin.slice(offset, offset+=2))+1;
            if (bin.length < offset+key_length) //Key length is greater than the remaining payload
                throw new Error("Bad binary payload");
            const key: string = buffer2string(bin.slice(offset, offset+=key_length), 'utf8');
            const value_length: number = trop2int(bin.slice(offset, offset+=3))+1;
            if (bin.length < offset+value_length) //Value length is greater than the remaining payload
                throw new Error("Bad binary payload");
            const value: string = buffer2string(bin.slice(offset, offset+=value_length), 'utf8');
            ret.add(key, value);
        }
        ret.binary = ()=>bin;
        return [ret, offset];
    }
    static compute_key(address: string, key: string): string{
        return createHash('sha256').update('channel_', 'utf8').update(address, 'hex').update(key, 'utf8').digest('binary');
    }
    apply(pack: Pack): void{
        Object.entries(this.payload).forEach(([key, value])=>db.set_channel(pack.r_author, key, value));
    }
}