import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./index.bin.js";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {binary2bigint, buffer2string} from "#lib/serde";

describe('[API] /stabilizers/index.json.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the binary-encoded stabilizers', async function () {
        const response = await get();
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.strictEqual(response.headers["content-type"], 'application/octet-stream');
        assert.lengthOf(response.body, ADDRESS_BYTE_LENGTH+BALANCE_WIDTH_BYTES);
        assert.strictEqual(buffer2string(response.body.slice(0, ADDRESS_BYTE_LENGTH), 'hex'), GENESIS_ACCOUNT_ADDRESS);
        assert.strictEqual(binary2bigint(response.body.slice(-BALANCE_WIDTH_BYTES)), 50000000000n);
    });
});