import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash} from "crypto";
import {bigint2word} from "#lib/serde";
import {OPS} from "#lib/vm/ops";
import Pack from "#classes/Pack";

describe('[Transitions] Dapp', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should work', async function () {
        const dapp_code = [OPS.LABEL, OPS.PUSH, ...bigint2word(5n), OPS.PUSH, ...bigint2word(4n), OPS.ADD];
        const pack = await new Pack().dapp(dapp_code).seal(GENESIS_ACCOUNT_PRIVKEY);
        const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary());
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const dapp_address: string = createHash('sha256').update('sca_', 'utf8').update(new Uint8Array(dapp_code)).digest('hex');
        assert.ok(Buffer.from(await db.get_smart_contract(dapp_address)).equals(Buffer.from(dapp_code)), "The dapp was correctly retrieved");
    });
});