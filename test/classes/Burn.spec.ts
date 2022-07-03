import {describe, it} from 'mocha';
import {assert} from 'chai';
import {binary2bigint, buffer2string, toJSON} from "#lib/serde";
import {randomBytes} from "crypto";
import {BALANCE_WIDTH_BYTES, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import Burn from "#classes/Burn";

describe('[Classes] Burn', async function (){
    it("should serialize and deserialize a burn transition", ()=>{
        const payload: Record<string, bigint> = {
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: 3000n,
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: 1000n
        };
        const support: Burn = new Burn(payload);
        const binary: Uint8Array = support.binary();
        const entry_count: number = binary[1]+1;
        assert.strictEqual(binary[0], TRANSITION_TYPES.BURN_TOKEN, 'Transition type is correctly set');
        let offset: number = 2;
        for (let i=0;i<entry_count;i++) {
            const token: string = buffer2string(binary.slice(offset, offset+=TOKEN_BYTE_LENGTH), 'base64url');
            const amount: bigint = binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES))+1n;
            assert.strictEqual(token, Object.entries(payload)[i][0], "Token was correctly encoded");
            assert.strictEqual(amount, Object.entries(payload)[i][1], "Amount was correctly encoded");
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Burn from a buffer", ()=>{
        const payload: Record<string, bigint> = {
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: 3000n,
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: 1000n
        };
        const support: Burn = new Burn(payload);
        const binary: Uint8Array = support.binary();

        const [burn_from_binary, length]: [Burn, number] = Burn.from_binary(binary);
        assert.deepStrictEqual(burn_from_binary.json(), {type: TRANSITION_TYPES.BURN_TOKEN, burn: JSON.parse(toJSON(payload))});
        assert.strictEqual(length, binary.length);
    });
});