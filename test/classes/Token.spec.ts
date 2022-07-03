import {describe, it} from 'mocha';
import {assert} from 'chai';
import {binary2bigint, buffer2string} from "#lib/serde";
import {randomBytes} from "crypto";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, COMMUNITY_ADDRESS, DEFAULT_TOKEN_NONCE, MAX_CAP, TRANSITION_TYPES} from "#constants";
import Token from "#classes/Token";

describe('[Classes] Definition', async function (){
    it("should serialize and deserialize", ()=>{
        const payload = [
            {cap: 2000n, issuers: [COMMUNITY_ADDRESS], burnable: true, nonce: DEFAULT_TOKEN_NONCE},
            {cap: 2222n, issuers: [COMMUNITY_ADDRESS, buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')], burnable: true, nonce: DEFAULT_TOKEN_NONCE}
        ];
        const token: Token = new Token(payload);
        const binary: Uint8Array = token.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.DEFINE_TOKEN, 'Transition type is correctly set');
        const entry_count: number = binary[1] +1;
        assert.strictEqual(entry_count, payload.length, `There are ${payload.length} token definitions`);
        let offset: number = 2;
        for (let i=0;i<entry_count;i++){
            const raw_burnable: number = binary[offset++];
            const burnable: boolean = raw_burnable < 2;
            const is_cap_explicit: boolean = raw_burnable === 0 || raw_burnable === 2;
            const cap: bigint = is_cap_explicit ? binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n : MAX_CAP;
            const issuers: string[] = [];
            let issuer_count: number = binary[offset++] +1;
            assert.strictEqual(issuer_count, payload[i].issuers.length);
            while (issuer_count > 0){
                const issuer: Uint8Array = binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH);
                issuers.push(buffer2string(issuer, 'hex'));
                issuer_count--;
            }
            const nonce: number = binary[offset++];
            assert.strictEqual(cap, payload[i].cap, 'Cap was correctly decoded');
            assert.strictEqual(burnable, payload[i].burnable, 'Burnable was correctly decoded');
            assert.deepStrictEqual(issuers, payload[i].issuers, 'Issuers was correctly decoded');
            assert.strictEqual(nonce, payload[i].nonce, 'Nonce was correctly decoded');
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Token from a buffer", ()=>{
        const payload = [
            {cap: 2000n, issuers: [COMMUNITY_ADDRESS], burnable: true, nonce: DEFAULT_TOKEN_NONCE},
            {cap: 2222n, issuers: [COMMUNITY_ADDRESS, buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')], burnable: true, nonce: DEFAULT_TOKEN_NONCE+1}
        ];
        const token: Token = new Token(payload);
        const binary: Uint8Array = token.binary();

        const [token_from_binary, length]: [Token, number] = Token.from_binary(binary);
        assert.deepStrictEqual(token_from_binary.json(), {type: TRANSITION_TYPES.DEFINE_TOKEN, tokens: payload});
        assert.strictEqual(length, binary.length);
    });
});