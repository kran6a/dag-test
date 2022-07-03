import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PRIVKEY} from "#constants";
import Pack from "#classes/Pack";

describe('[Transitions] Channel', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should create a channel', async function () {
        const key: string = 'awesome_answer';
        const value: string = "42";
        const pack: Pack = await new Pack().channel(key, value).seal(GENESIS_ACCOUNT_PRIVKEY);

        const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary());
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const r_value: string = await db.get_channel(GENESIS_ACCOUNT_ADDRESS, "awesome_answer");
        assert.strictEqual(r_value, '42');
    });
    //it('should fail if the value is too long', async function () {
    //    const {ok, err}: Option<string> = await new Packer().channel( "awesome_answer", randomBytes(MAX_CHANNEL_VALUE_LENGTH+1).toString('hex')).sign_and_hash(net.stabilizers[0].privkey, JSON.parse(await db.get('leaves')), await db.get('milestone')).submit();
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Channel value is too long");
    //});
});