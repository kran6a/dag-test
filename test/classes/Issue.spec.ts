import {describe, it} from 'mocha';
import {assert} from 'chai';
import {binary2bigint, buffer2string, toJSON} from "#lib/serde";
import {randomBytes} from "crypto";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, COMMUNITY_ADDRESS, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import Issue from "#classes/Issue";

describe('[Classes] Issue', async function (){
    it("should serialize and deserialize", ()=>{
        const payload = {
            [BASE_TOKEN]: {
                [COMMUNITY_ADDRESS]: 394n,
                [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: 100n
            },
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: {
                [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: 100n
            }
        };
        const token: Issue = new Issue(payload);
        const binary: Uint8Array = token.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.ISSUE, 'Transition type is correctly set');
        const token_count: number = binary[1] +1;
        assert.strictEqual(token_count, Object.entries(payload).length, `There are ${payload.length} tokens being issued`);
        let offset: number = 2;
        for (let i=0;i<token_count;i++){
            const token: string = buffer2string(binary.slice(offset, offset+=TOKEN_BYTE_LENGTH), 'base64url');
            assert.strictEqual(token, Object.entries(payload)[i][0], 'Token was decoded correctly');
            const entry_count: number = binary[offset++]+1;
            assert.strictEqual(entry_count, Object.entries(Object.values(payload)[i]).length, "The number of receiver was correctly decoded");
            for (let i=0;i<entry_count;i++){
                const address: string = buffer2string(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
                assert.strictEqual(address, Object.keys(payload[token])[i]);
                const amount: bigint = binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n;
                assert.strictEqual(amount, payload[token][address]);
            }
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate an Issue from a buffer", ()=>{
        const payload = {
            [BASE_TOKEN]: {
                [COMMUNITY_ADDRESS]: 394n,
                [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: 100n
            },
            [buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url')]: {
                [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: 100n
            }
        };
        const token: Issue = new Issue(payload);
        const binary: Uint8Array = token.binary();

        const [issue_from_binary, length]: [Issue, number] = Issue.from_binary(binary);
        assert.deepStrictEqual(issue_from_binary.json(), {type: TRANSITION_TYPES.ISSUE, issue: JSON.parse(toJSON(payload))});
        assert.strictEqual(length, binary.length);
    });
});