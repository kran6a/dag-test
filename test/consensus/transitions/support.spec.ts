import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PUBKEY, GENESIS_BALANCE} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash, randomBytes} from "crypto";
import Pack from "#classes/Pack";
import secp256k1 from "secp256k1";

type Account = {address: string, pubkey: string, privkey: string};
const create_account = (): Account=>{
    let privKey;
    do {
        privKey = randomBytes(32);
    } while (!secp256k1.privateKeyVerify(privKey));

    const pubKey: Uint8Array = secp256k1.publicKeyCreate(privKey);
    return {
        address: createHash('sha256').update(Buffer.from(pubKey)).digest('hex'),
        pubkey: Buffer.from(pubKey).toString('hex'),
        privkey: privKey.toString('hex')
    };
}

describe('[Transitions] Support stabilizer', async function (){
    let second_stabilizer: Account = create_account();
    beforeEach(async function(){
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: GENESIS_BALANCE/10n, [second_stabilizer.pubkey]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 3000000n, [second_stabilizer.address]: 300000n}});
    });
    it('should be able to support a normal user', async function () {
        const supportee: string = randomBytes(32).toString("hex");
        const support: bigint = 101n;
        {
            const {ok, err}: Option<string> = await (await new Pack().support(supportee, support).seal(GENESIS_ACCOUNT_PRIVKEY)).submit();
            assert.isUndefined(err, "No error was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        {
            const {ok, err}: Option<string> = await (await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 1n).seal(second_stabilizer.privkey)).submit();
            assert.isUndefined(err, "No error was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        const stabilizers: Map<string, bigint> = await db.get_stabilizers();
        assert.isTrue(stabilizers.has(supportee), "The supportee became an stabilizer");
        assert.strictEqual(stabilizers.get(supportee), support, "The stabilizer weight was set");
    });
    it('should be able to support a stabilizer', async function () {
        const supportee: string = GENESIS_ACCOUNT_ADDRESS;
        const support: bigint = 12n;
        const pack: Pack = await new Pack().support(supportee, support).seal(GENESIS_ACCOUNT_PRIVKEY);
        const previous_support: bigint = (await db.get_stabilizers()).get(supportee) ?? 0n;
        const previous_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        {
            const {ok, err}: Option<string> = await pack.submit();
            assert.isUndefined(err, "No error was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        {
            const {ok, err}: Option<string> = await (await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 1n).seal(second_stabilizer.privkey)).submit();
            assert.isUndefined(err, "No error was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        {
            const {ok, err}: Option<Pack> = await db.get_pack(<string>pack.r_hash);
            assert.isUndefined(err, "The pack was stored in the DB");
            assert.isTrue(ok?.stable, "The pack is stable");
        }
        const balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const commission: bigint = await pack.get_commissions();
        assert.strictEqual(balance,  previous_balance - commission - support, "Balance was reduced correctly");

        const stabilizers: Map<string, bigint> = await db.get_stabilizers();
        assert.strictEqual(stabilizers.get(supportee), previous_support + 12n, "There are two stabilizers");
    });
    it('should not allow unstaking more than staked', async function () {
        const prev_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const prev_stake: bigint = (await db.get_stabilizers()).get(GENESIS_ACCOUNT_ADDRESS) ?? 0n;
        const amount: bigint = (prev_stake+1n)*-1n;
        const pack: Pack = await new Pack().support(GENESIS_ACCOUNT_ADDRESS, amount).seal(GENESIS_ACCOUNT_PRIVKEY);
        {
            const {ok, err}: Option<string> = await pack.submit();
            assert.isUndefined(err, "No err was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        { //For stabilization purposes
            const {ok, err}: Option<string> = await (await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 1n).seal(second_stabilizer.privkey)).submit();
            assert.isUndefined(err, "No err was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        const balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const commission: bigint = await pack.get_commissions();

        assert.strictEqual(balance, (prev_balance - commission), "Only commissions were charged");
        assert.strictEqual(await db.get_support(GENESIS_ACCOUNT_ADDRESS), prev_stake, 'The supportee did not receive any support');
    });
    it('should be able to unstake', async function () {
        const prev_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const prev_stake: bigint = (await db.get_stabilizers()).get(GENESIS_ACCOUNT_ADDRESS) ?? 0n;
        const amount: bigint = -1n;
        const pack: Pack = await new Pack().support(GENESIS_ACCOUNT_ADDRESS, amount).seal(GENESIS_ACCOUNT_PRIVKEY);
        {
            const {ok, err}: Option<string> = await pack.submit();
            assert.isUndefined(err, "No err was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        {
            const {ok, err}: Option<string> = await (await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 1n).seal(second_stabilizer.privkey)).submit();
            assert.isUndefined(err, "No err was returned");
            assert.isString(ok, "The pack hash was returned");
        }

        const balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const commission: bigint = await pack.get_commissions();

        assert.strictEqual(balance, prev_balance - commission + amount*-1n, "The supporter balance was adjusted correctly");
        assert.strictEqual(await db.get_support(GENESIS_ACCOUNT_ADDRESS), prev_stake+amount, 'The supportee support was reduced');
        assert.strictEqual(await db.get_staked_by_to(GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_ADDRESS), prev_stake+amount, 'The supporter stake for the supportee was changed');
    });
});