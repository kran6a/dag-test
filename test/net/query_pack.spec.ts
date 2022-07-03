import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {query_pack} from "#lib/network";
import Pack from "#classes/Pack";
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_PRIVKEY} from "#constants";
import handle_incoming_pack from "#lib/handle_incoming_pack";

describe('[Net] query pack', async function (){
    this.timeout(600000);
    beforeEach(async function(){
        await db.initialize();
    });
    it('should get the requested pack', async function () {
        const pack_hash: Option<string> = await handle_incoming_pack((await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY)).binary(), false);
        assert.strictEqual(pack_hash.err, undefined, "No error was thrown");
        const network_response: Pack = await query_pack(pack_hash.ok);
        const db_pack: Option<Pack> = await db.get_pack(pack_hash.ok);
        assert.deepStrictEqual(network_response.binary(), db_pack.ok.binary(), "The received pack matches the stored one");
    });
});