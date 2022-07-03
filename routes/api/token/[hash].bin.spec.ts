import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./[hash].bin.js";
import {BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS, GENESIS_BALANCE} from "#constants";
import {bin2token} from "#lib/serde";

describe('[API] /token/[hash].bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the base token info', async function () {
        const response = await get({params: {hash: BASE_TOKEN}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.strictEqual(response.headers["content-type"], 'application/json');
        assert.deepStrictEqual(bin2token(<Uint8Array>response.body), {
            cap: GENESIS_BALANCE,
            issuers: [GENESIS_ACCOUNT_ADDRESS],
            burnable: false
        });
    });
});