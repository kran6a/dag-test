import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./[name].bin.js";
import {GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from '#secrets';
import Pack from "#classes/Pack";
import {buffer2string} from "#lib/serde";

describe('[API] /account/[address]/channel/[name].bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
        const pack = await new Pack().channel('foo', 'bar').seal(GENESIS_ACCOUNT_PRIVKEY);
        await pack.submit();
    });
    it('should return the correct balance', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS, name: 'foo'}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'application/octet-stream', 'content-length': response.body.length, 'cache-control': 'no-store'});
        assert.lengthOf(response.body, 3);
        assert.strictEqual(buffer2string(<Uint8Array>response.body, 'utf8'), 'bar');
    });
});