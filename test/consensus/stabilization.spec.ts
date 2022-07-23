import {describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PUBKEY, PUBKEY_BYTE_LENGTH} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import Pack from "#classes/Pack";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {createHash, randomBytes} from "crypto";
import secp256k1 from "secp256k1";
import {buffer2string} from "#lib/serde";
import Account from "#classes/Account";

const generate_account = ()=>{
    let private_key;
    do {
        private_key = randomBytes(32)
    } while (!secp256k1.privateKeyVerify(private_key));
    const public_key = secp256k1.publicKeyCreate(private_key);
    return {private_key: buffer2string(private_key, 'hex'), public_key: buffer2string(public_key, 'hex'), address: createHash('sha256').update(public_key).digest('hex')};
}

//TODO fix

describe('[Consensus] Stabilization', async function (){
    this.timeout(600000);
    it('should instantly become stable', async function () {
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 100_000n}});
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary(), true);
        assert.isUndefined(err, "No error was produced");
        assert.strictEqual(ok, pack.r_hash, "The pack hash was returned");
        const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>pack.r_hash);
        assert.isUndefined(db_err, "The pack was fetched from the DB");
        assert.isTrue(db_pack?.stable, "The pack is stable");
    });
    it('should not become stable', async function () {
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 100n, [randomBytes(PUBKEY_BYTE_LENGTH).toString('hex')]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 100_000n}});
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary(), true);
        assert.isUndefined(err, "No error was produced");
        assert.strictEqual(ok, pack.r_hash, "The pack hash was returned");
        const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>pack.r_hash);
        assert.isUndefined(db_err, "The pack was fetched from the DB");
        assert.isFalse(db_pack?.stable, "The pack is NOT stable");
    });
    it('should become stable', async function () {
        const account = generate_account();
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 100n, [account.public_key]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 100_000n, [account.address]: 100_000n}});
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).seal(GENESIS_ACCOUNT_PRIVKEY);
        { //First pack cannot be stabilized due to having only 1/2 support
            const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, pack.r_hash, "The pack hash was returned");
            const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>pack.r_hash);
            assert.isUndefined(db_err, "The pack was fetched from the DB");
            assert.isFalse(db_pack?.stable, "The pack is NOT stable");
        }
        { //Second pack stabilizes the first one but it is itself unstable
            const stabilizator_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).seal(account.private_key);
            const {ok, err}: Option<string> = await handle_incoming_pack(stabilizator_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, stabilizator_pack.r_hash, "The pack hash was returned");
            { //Check second pack
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>stabilizator_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isFalse(db_pack?.stable, "The second pack is NOT stable");
            }
            { //Check first pack
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isTrue(db_pack?.stable, "The first pack is stable");
            }
        }
    });
    it('should stabilize packs in two branches', async function () {
        const account1 = generate_account();
        const account2 = generate_account();
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 100n, [account1.public_key]: 100n, [account2.public_key]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 100_000n, [account1.address]: 100_000n, [account2.address]: 100_000n}});
        const leaves: string[] = await db.get_leaves();
        const first_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).parent(leaves[0]).seal(GENESIS_ACCOUNT_PRIVKEY);
        { //First pack only has the genesis as a parent
            const {ok, err}: Option<string> = await handle_incoming_pack(first_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, first_pack.r_hash, "The pack hash was returned");
            const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>first_pack.r_hash);
            assert.isUndefined(db_err, "The pack was fetched from the DB");
            assert.isFalse(db_pack?.stable, "The pack is NOT stable");
        }
        const second_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).parent(leaves[0]).seal(account2.private_key);
        { //Second pack also has only the genesis as a parent. The DAG has now two heads
            const {ok, err}: Option<string> = await handle_incoming_pack(second_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, second_pack.r_hash, "The pack hash was returned");
            { //Check second pack
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>second_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isFalse(db_pack?.stable, "The second pack is NOT stable");
            }
        }
        const third_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 11n).parent(<string>second_pack.r_hash).parent(<string>first_pack.r_hash).seal(account1.private_key);
        { //Third pack stabilizes both packs
            const {ok, err}: Option<string> = await handle_incoming_pack(third_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, third_pack.r_hash, "The pack hash was returned");
            { //Check that second_pack is stable
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>second_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isTrue(db_pack?.stable, "The second pack is stable");
            }
            { //Check that first_pack is stable
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>first_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isTrue(db_pack?.stable, "The first pack is stable");
            }
        }
    });
    it('should stabilize only one branch', async function () {
        const account1 = generate_account();
        const peasant = generate_account();
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 101n, [account1.public_key]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 100_000n, [account1.address]: 100_000n}});
        const leaves: string[] = await db.get_leaves();
        new Account([peasant.public_key]).apply();
        db.set_balance(peasant.address, BASE_TOKEN, 50000n);
        const first_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).parent(leaves[0]).seal(peasant.private_key);
        { //First pack only has the genesis as a parent
            const {ok, err}: Option<string> = await handle_incoming_pack(first_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, first_pack.r_hash, "The pack hash was returned");
            const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>first_pack.r_hash);
            assert.isUndefined(db_err, "The pack was fetched from the DB");
            assert.isFalse(db_pack?.stable, "The pack is NOT stable");
        }
        const second_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 10n).parent(leaves[0]).seal(account1.private_key);
        { //Second pack also has only the genesis as a parent. The DAG has now two heads
            const {ok, err}: Option<string> = await handle_incoming_pack(second_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, second_pack.r_hash, "The pack hash was returned");
            { //Check second pack
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>second_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isFalse(db_pack?.stable, "The second pack is NOT stable");
            }
        }
        const third_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 11n).seal(GENESIS_ACCOUNT_PRIVKEY);
        { //Third pack stabilizes both packs
            const {ok, err}: Option<string> = await handle_incoming_pack(third_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, third_pack.r_hash, "The pack hash was returned");
            { //Check that second_pack is stable
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>second_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isTrue(db_pack?.stable, "The second pack is stable");
            }
            { //Check that first_pack is NOT stable
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>first_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isFalse(db_pack?.stable, "The first pack is NOT stable");
            }
        }
        const fourth_pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 11n).seal(account1.private_key);
        {
            const {ok, err}: Option<string> = await handle_incoming_pack(fourth_pack.binary(), true);
            assert.isUndefined(err, "No error was produced");
            assert.strictEqual(ok, fourth_pack.r_hash, "The pack hash was returned");
            { //Check that first pack is now stable
                const {ok: db_pack, err: db_err}: Option<Pack> = await db.get_pack(<string>first_pack.r_hash);
                assert.isUndefined(db_err, "The pack was fetched from the DB");
                assert.isTrue(db_pack?.stable, "The first pack is stable");
            }
        }
    });
    //it('should fail', async function(){
    //    assert.strictEqual(false, true);
    //});
});