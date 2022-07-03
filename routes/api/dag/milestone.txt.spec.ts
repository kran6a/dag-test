import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./milestone.txt.js";
import {GENESIS_UNIT_HASH} from "#constants";

describe('[API] /dag/milestone.txt.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the milestone', async function () {
        const response = await get();
        assert.lengthOf(response.body, 43);
        assert.strictEqual(response.body, GENESIS_UNIT_HASH);
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'text/plain', 'content-length': 43, 'cache-control': 'no-store'});
    });
});