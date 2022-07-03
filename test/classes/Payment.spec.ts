import {describe, it} from 'mocha';
import {assert} from 'chai';
import {binary2bigint, buffer2string} from "#lib/serde";
import Payment from "#classes/Payment"
import {randomBytes} from "crypto";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, COMMUNITY_ADDRESS, TOKEN_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";

describe('[Classes] Payment', async function (){
    it("should serialize and deserialize a token", ()=>{
        const address: string = buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex');
        const payment1: Payment = new Payment({'base': {[address]: 1000n}})
        const binary = payment1.binary();

        assert.strictEqual(binary[0], TRANSITION_TYPES.PAYMENT, 'Transition type is correctly set');
        assert.strictEqual(binary[1]+1, 1, "Token count is correctly set");
        let offset: number = 2;
        const token_binary: Uint8Array = binary.slice(offset, offset+=TOKEN_BYTE_LENGTH);
        assert.strictEqual(token_binary.length, TOKEN_BYTE_LENGTH, 'Token is of length 32');
        assert.strictEqual(buffer2string(token_binary, 'base64url'), BASE_TOKEN, "Token is base token");
        const base_output_count: number = binary[offset++] +1;
        assert.strictEqual(base_output_count, 1, 'There is 1 base token output');
        const address_binary: Uint8Array = binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH);
        assert.lengthOf(address_binary, ADDRESS_BYTE_LENGTH, `Address is ${ADDRESS_BYTE_LENGTH} bytes`);
        assert.strictEqual(buffer2string(address_binary, 'hex'), address, "Address was decoded correctly");
        const amount: bigint = binary2bigint(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH))+1n;
        assert.strictEqual(amount, 1000n, "Balance was decoded correctly");
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Payment from a buffer", ()=>{
        const address: string = buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex');
        const token: string = buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url');
        const payment1: Payment = new Payment({'base': {[address]: 1000n}, [token]: {[address]: 1000n, [COMMUNITY_ADDRESS]: 2000n}});
        const binary: Uint8Array = payment1.binary();

        assert.strictEqual(binary[0], TRANSITION_TYPES.PAYMENT, 'Transition type is correctly set');
        assert.strictEqual(binary[1]+1, 2, "Token count is correctly set");
        let offset: number = 2;

        const first_token_binary: Uint8Array = binary.slice(offset, offset+=TOKEN_BYTE_LENGTH);
        assert.strictEqual(first_token_binary.length, TOKEN_BYTE_LENGTH, `Token is of length ${TOKEN_BYTE_LENGTH}`);
        assert.strictEqual(buffer2string(first_token_binary, 'base64url'), BASE_TOKEN, "Token is base token");
        const base_output_count: number = binary[offset++]+1;
        assert.strictEqual(base_output_count, 1, 'There is 1 base token output');
        const address_binary: Uint8Array = binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH);
        assert.lengthOf(address_binary, ADDRESS_BYTE_LENGTH, `Address is ${ADDRESS_BYTE_LENGTH} bytes`);
        assert.strictEqual(buffer2string(address_binary, 'hex'), address, "Address was decoded correctly");
        const amount: bigint = binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES))+1n;
        assert.strictEqual(amount, 1000n, "Balance was decoded correctly");

        const asset_token_binary: Uint8Array = binary.slice(offset, offset+=TOKEN_BYTE_LENGTH);
        assert.strictEqual(buffer2string(asset_token_binary, 'base64url'), token);
        const asset_output_count: number = binary[offset++]+1;
        assert.strictEqual(asset_output_count, 2, 'There are 2 asset base token outputs');
        const first_output_address: string = buffer2string(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
        assert.strictEqual(first_output_address, address);
        const first_output_amount: bigint = binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES))+1n;
        assert.strictEqual(first_output_amount, 1000n);

        const second_output_address: string = buffer2string(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
        assert.strictEqual(second_output_address, COMMUNITY_ADDRESS);
        const second_output_amount: bigint = binary2bigint(binary.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n;
        assert.strictEqual(second_output_amount, 2000n);



        const from_buffer = Payment.from_binary(binary)[0].json();
        assert.strictEqual(Payment.from_binary(binary)[1], binary.length);
        assert.deepStrictEqual(from_buffer, {[BASE_TOKEN]: {[address]: 1000n}, [token]: {[address]: 1000n, [COMMUNITY_ADDRESS]: 2000n}}, "We got the expected payment");
    });
});