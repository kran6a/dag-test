import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {BASE_TOKEN, COMMUNITY_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {db} from '#db';
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Pack from "#classes/Pack";
import {get} from "./leaves.json.js";
import {is_ok} from "#lib/validation";

describe('[API] /dag/leaves.json.ts', ()=>{
    let hash: string | undefined;
    beforeEach(async function(){
        await db.initialize();
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const opt: Option<string> = await handle_incoming_pack(pack.binary());
        assert.isTrue(is_ok(opt), "A pack was rejected");
        hash = pack.r_hash;
    });
    it('should match the generated pack', async function () {
        const response = await get();
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'application/json', 'content-length': JSON.stringify([hash]).length, 'cache-control': 'no-store'});
        assert.deepStrictEqual(response.body, [hash]);
    });
});