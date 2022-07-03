import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./[hash].json.js";
import {BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS, GENESIS_BALANCE} from "#constants";
import {fromJSON} from "#lib/serde";

describe('[API] /token/[hash].json.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the base token info', async function () {
        const response = await get({params: {hash: BASE_TOKEN}});
        const body: any = fromJSON(response.body);
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.strictEqual(response.headers["content-type"], 'application/json');
        assert.deepStrictEqual(body, {
            hash: BASE_TOKEN,
            cap: GENESIS_BALANCE,
            issuers: [GENESIS_ACCOUNT_ADDRESS],
            burnable: false,
            supply: GENESIS_BALANCE
        });
    });
});