import {describe, it} from 'mocha';
import {assert} from 'chai';
import {binary2bigint, buffer2string, toJSON} from "#lib/serde";
import {randomBytes} from "crypto";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, COMMUNITY_ADDRESS, TRANSITION_TYPES} from "#constants";
import Support from "#classes/Support";

describe('[Classes] Support', async function (){
    it("should serialize and deserialize a support transition", ()=>{
        const payload: Record<string, bigint> = {[COMMUNITY_ADDRESS]: 3000n, [randomBytes(ADDRESS_BYTE_LENGTH).toString('hex')]: -1000n};
        const support: Support = new Support(payload);
        const binary: Uint8Array = support.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.SUPPORT, 'Transition type is correctly set');
        assert.strictEqual(binary[1], Object.entries(payload).length -1);
        let offset: number = 2;
        for (let i=0;i<binary[1]+1;i++) {
            assert.strictEqual(binary[offset++], Object.entries(payload)[i][1] > 0n ? 1 : 0, "Sign byte is correctly set");
            assert.strictEqual(buffer2string(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex'), Object.entries(payload)[i][0], "Address was correctly encoded");
            assert.strictEqual(binary2bigint(binary.slice(offset+1, offset+=BALANCE_WIDTH_BYTES))+1n, Object.entries(payload)[i][1] >= 0n ? Object.entries(payload)[i][1] : -1n * Object.entries(payload)[i][1], "Support was correctly encoded");
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Support from a buffer", ()=>{
        const payload: Record<string, bigint> = {[COMMUNITY_ADDRESS]: 3000n, [randomBytes(ADDRESS_BYTE_LENGTH).toString('hex')]: 1000n};
        const support: Support = new Support(payload);
        const binary: Uint8Array = support.binary();

        const [support_from_binary, length]: [Support, number] = Support.from_binary(binary);
        assert.deepStrictEqual(support_from_binary.json(), {type: TRANSITION_TYPES.SUPPORT, support: JSON.parse(toJSON(payload))});
        assert.strictEqual(length, binary.length);
    });
});