import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./index.json.js";
import {GENESIS_ACCOUNT_ADDRESS} from "#constants";

describe('[API] /stabilizers/index.json.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the stabilizers', async function () {
        const response = await get();
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.strictEqual(response.headers["content-type"], 'application/json');
        assert.lengthOf(Object.entries(response.body), 1);
        assert.strictEqual(response.body[GENESIS_ACCOUNT_ADDRESS], '50000000000');
    });
});