import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./milestone.bin.js";
import {GENESIS_UNIT_HASH} from "#constants";
import {buffer2string} from "#lib/serde";

describe('[API] /dag/milestone.bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the milestone', async function () {
        const response = await get();
        assert.lengthOf(response.body, 32);
        assert.strictEqual(buffer2string(response.body, 'base64url'), GENESIS_UNIT_HASH);
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'text/plain', 'content-length': 32, 'cache-control': 'no-store'});
    });
});