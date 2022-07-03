import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./index.bin.js";
import {GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PUBKEY, PUBKEY_BYTE_LENGTH} from "#constants";
import {buffer2string} from "#lib/serde";

describe('[API] /token/[hash].bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the base token info', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {
            "content-type": "text/plain",
            "cache-control": "public,immutable",
            "content-length": PUBKEY_BYTE_LENGTH
        });
        assert.strictEqual(buffer2string(<Uint8Array>response.body, 'hex'), GENESIS_ACCOUNT_PUBKEY);
    });
});