import {describe, it} from 'mocha';
import {assert} from 'chai';
import {buffer2string, dop2int, trop2int} from "#lib/serde";
import {randomBytes} from "crypto";
import {ADDRESS_BYTE_LENGTH, COMMUNITY_ADDRESS, TRANSITION_TYPES} from "#constants";
import Channel from "#classes/Channel";

describe('[Classes] Channel', async function (){
    it("should serialize and deserialize a channel transition", ()=>{
        const payload: Record<string, string> = {[COMMUNITY_ADDRESS]: buffer2string(new Uint8Array([256]), 'utf8'), [randomBytes(ADDRESS_BYTE_LENGTH).toString('hex')]: "1000n"};
        const channel: Channel = new Channel(payload);
        const binary: Uint8Array = channel.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.UPDATE_CHANNEL, 'Transition type is correctly set');
        const number_of_entries: number = binary[1]+1;
        assert.strictEqual(number_of_entries, Object.entries(payload).length, `There are ${Object.entries(payload).length} channel updates`);
        let offset: number = 2;
        for (let i=0;i<number_of_entries;i++) {
            const key_length: number = dop2int(binary.slice(offset, offset+=2))+1;
            const key: string = buffer2string(binary.slice(offset, offset+=key_length), 'utf8');
            const value_length: number = trop2int(binary.slice(offset, offset+=3))+1;
            const value: string = buffer2string(binary.slice(offset, offset+=value_length), 'utf8');
            assert.strictEqual(key, Object.entries(payload)[i][0], "Key was correctly encoded");
            assert.strictEqual(value, Object.entries(payload)[i][1], "Value was correctly encoded");
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Channel from a buffer", ()=>{
        const payload: Record<string, string> = {[COMMUNITY_ADDRESS]: buffer2string(new Uint8Array([256]), 'utf8'), [randomBytes(ADDRESS_BYTE_LENGTH).toString('hex')]: "1000n"};
        const support: Channel = new Channel(payload);
        const binary: Uint8Array = support.binary();

        const [channel_from_binary, length]: [Channel, number] = Channel.from_binary(binary);
        assert.deepStrictEqual(channel_from_binary.json(), payload);
        assert.strictEqual(length, binary.length);
    });
});