import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {broadcast_pack} from "#network";
import Pack from "#classes/Pack";
import {BASE_TOKEN, COMMUNITY_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {sleep} from "#lib/utils";

describe('[Net] broadcast pack', async function (){
    this.timeout(600000);
    beforeEach(async function(){
        await db.initialize();
    });
    it('should get the requested pack', async function () {
        const pack: Pack = (await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY));
        await broadcast_pack(pack);
        await sleep(250);
        const db_pack: Option<Pack> = await db.get_pack(<string>pack.r_hash);
        assert.isUndefined(db_pack.err, "The pack was found");
        assert.deepStrictEqual(pack.binary(), db_pack!.ok!.binary(), "The pack was added to the DB through broadcasting");
    });
});