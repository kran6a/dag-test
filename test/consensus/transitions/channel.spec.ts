import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {GENESIS_ACCOUNT_ADDRESS, MAX_CHANNEL_VALUE_LENGTH} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import Pack from "#classes/Pack";
import {randomBytes} from "crypto";
import {silence} from "#lib/logger";
silence('DB');
describe('[Transitions] Channel', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should create a channel', async function () {
        const key: string = 'awesome_answer';
        const value: string = "42";
        const pack: Pack = await new Pack().channel(key, value).seal(GENESIS_ACCOUNT_PRIVKEY);

        const {ok, err}: Option<string> = await pack.submit();
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const r_value: string = await db.get_channel(GENESIS_ACCOUNT_ADDRESS, "awesome_answer");
        assert.strictEqual(r_value, '42');
    });
    it('should fail if the value is too long', async function () {
        try {
            await (await new Pack().channel("awesome_answer", randomBytes(MAX_CHANNEL_VALUE_LENGTH + 100).toString('hex')).seal(GENESIS_ACCOUNT_PRIVKEY)).submit();
        } catch (e) {
            assert.strictEqual((<Error>e).message, 'Bad binary payload');
            assert.strictEqual((<Error>e)!.cause!.message, 'Value length is grater than MAX_CHANNEL_VALUE_LENGTH')
        }
    });
});