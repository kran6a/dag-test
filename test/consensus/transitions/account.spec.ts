import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PRIVKEY, GENESIS_ACCOUNT_PUBKEY, GENESIS_BALANCE, PUBKEY_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {createHash, randomBytes} from "crypto";
import Pack from "#classes/Pack";
import secp256k1 from "secp256k1";

const create_account = ()=>{
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
describe('[Transitions] Account definition', async function (){
    beforeEach(async function(){
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: GENESIS_BALANCE/10n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 500000n}});
    });
    it('should create an account', async function () {
        const initial_balance = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const pubkey: string = randomBytes(PUBKEY_BYTE_LENGTH).toString('hex');
        const pack: Pack = await new Pack().account(pubkey).seal(GENESIS_ACCOUNT_PRIVKEY);
        {
            const {ok, err}: Option<string> = await pack.submit();
            assert.isUndefined(err, "No error was returned");
            assert.isString(ok, "The pack hash was returned");
        }
        const account_pubkey: string = await db.get_pubkey(createHash('sha256').update(pubkey, 'hex').digest('hex'));
        assert.strictEqual(pubkey, account_pubkey);
        const commissions: bigint = await pack.get_commissions();
        const {ok, err}: Option<Pack> = await db.get_pack(pack.r_hash);
        assert.isUndefined(err, 'The pack was found in the DB');
        assert.isTrue(ok?.stable, 'The pack is stable');
        assert.strictEqual(await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN), initial_balance - commissions, 'Commissions have been charged');
    });
});