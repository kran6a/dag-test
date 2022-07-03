import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./[token].bin.js";
import {BALANCE_WIDTH_BYTES, BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS, GENESIS_BALANCE, GENESIS_SUPPORT} from "#constants";
import {binary2bigint} from "#lib/serde";

describe('[API] /account/[address]/balance/[token].bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the correct balance', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS, token: BASE_TOKEN}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'application/octet-stream', 'content-length': response.body.length, 'cache-control': 'no-store'});
        assert.lengthOf(response.body, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(<Uint8Array>response.body), GENESIS_BALANCE - GENESIS_SUPPORT);
    });
});