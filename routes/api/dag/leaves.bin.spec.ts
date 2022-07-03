import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_PRIVKEY} from "#constants";
import {db} from '#db';
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Pack from "#classes/Pack";
import {get} from "./leaves.bin.js";
import {buffer2string} from "#lib/serde";

describe('[API] /dag/leaves.bin.ts', ()=>{
    let hash: string;
    beforeEach(async function(){
        await db.initialize();
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY);
        await handle_incoming_pack(pack.binary());
        hash = pack.r_hash;
    });
    it('should match the generated pack', async function () {
        const response = await get();
        assert.lengthOf(response.body, 32);
        assert.strictEqual(buffer2string(response.body, 'base64url'), hash);
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'application/json', 'content-length': JSON.stringify([hash]).length, 'cache-control': 'no-store'});
    });
});