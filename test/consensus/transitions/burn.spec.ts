import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {DEFAULT_TOKEN_NONCE, GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash} from "crypto";
import {buffer2string} from "#lib/serde";
import Pack from "#classes/Pack";
import {is_ok} from "#lib/validation";

describe('[Transitions] Burn token', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should work', async function () {
        const token_definition = {
            cap: 2000n,
            burnable: true,
            issuers: [GENESIS_ACCOUNT_ADDRESS],
            nonce: DEFAULT_TOKEN_NONCE
        };
        const pack: Pack = await new Pack().token(token_definition).seal(GENESIS_ACCOUNT_PRIVKEY);
        const bin1: Uint8Array = pack.binary();
        let {ok, err}: Option<string> = await handle_incoming_pack(bin1);
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");


        const token_hash: string = buffer2string(createHash('sha256').update('token_', 'utf8').update(<string>pack.r_hash, 'base64url').update('_', 'utf8').update(new Uint8Array([DEFAULT_TOKEN_NONCE])).digest(), 'base64url');
        const issuing_pack: Pack = await new Pack().issue(GENESIS_ACCOUNT_ADDRESS, token_hash, 100n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const bin2 = issuing_pack.binary();
        assert.deepStrictEqual(await db.get_leaves(), issuing_pack.r_parents, "");
        ({ok, err} = await handle_incoming_pack(bin2));
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, token_hash);
        assert.strictEqual(balance, 100n, "Issue worked");


        const burn_pack: Pack = await new Pack().burn(token_hash, 50n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const bin3 = burn_pack.binary();
        ({ok, err} = await handle_incoming_pack(bin3));
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const opt: Option<{ hash: string; cap: bigint; burnable: boolean; issuers: string[]; supply: bigint }> = await db.get_token(token_hash);
        assert.isTrue(is_ok(opt), 'The token could not be retrieved from the DB');
        const new_balance = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, token_hash);
        assert.strictEqual(new_balance, 50n, "Balance was correctly reduced");
        assert.strictEqual(opt!.ok!.supply, 50n, "Token supply was correctly adjusted");
    });
    //TODO have a look at this
    //it('should not allow burning unburnable tokens', async function () {
    //    const definition_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '2000n',
    //                    burnable: false,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    let signed: Pack = await sign_and_hash(definition_pack, make_signer(net.stabilizers[0].privkey));
    //    let {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const token_hash: string = createHash('sha256').update('token_', 'utf8').update(ok, 'base64url').update('_', 'utf8').update(definition_pack.body[0].nonce || DEFAULT_TOKEN_NONCE, 'hex').digest('base64url');
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //            type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                [token_hash]: {
    //                    [net.stabilizers[0].address]: '2000n'
    //                }
    //            }
    //        }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await handle_incoming_pack(signed));
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const balance: bigint = await get_balance(db, net.stabilizers[0].address, token_hash);
    //    assert.strictEqual(balance, 2000n);
    //    const burn_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Burn>{
    //                type: TRANSITION_TYPES.BURN_TOKEN,
    //                burn: {
    //                    [token_hash]: '1000n'
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(burn_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Some token cannot be burnt");
    //});
    //it('should not allow burning a negative amount of tokens', async function () {
    //    const definition_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '2000n',
    //                    burnable: true,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    let signed: Pack = await sign_and_hash(definition_pack, make_signer(net.stabilizers[0].privkey));
    //    let {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const token_hash: string = createHash('sha256').update('token_', 'utf8').update(ok, 'base64url').update('_', 'utf8').update(definition_pack.body[0].nonce || DEFAULT_TOKEN_NONCE, 'hex').digest('base64url');
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //            type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                [token_hash]: {
    //                    [net.stabilizers[0].address]: '2000n'
    //                }
    //            }
    //        }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await handle_incoming_pack(signed));
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const balance: bigint = await get_balance(db, net.stabilizers[0].address, token_hash);
    //    assert.strictEqual(balance, 2000n);
    //    const burn_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Burn>{
    //                type: TRANSITION_TYPES.BURN_TOKEN,
    //                burn: {
    //                    [token_hash]: '-1000n'
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(burn_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.isUndefined(ok, "Invalid amount of tokens to burn");
    //    assert.strictEqual(err, "Invalid amount of tokens to burn");
    //});
    //it('should not allow burning a nonexistant token', async function () {
    //    const burn_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Burn>{
    //                type: TRANSITION_TYPES.BURN_TOKEN,
    //                burn: {
    //                    [randomBytes(32).toString('hex')]: '-1000n'
    //                }
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(burn_pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "Invalid amount of tokens to burn");
    //    assert.strictEqual(err, "Invalid token hash");
    //});
    //it('should not allow burning a token I cannot issue', async function () {
    //    const definition_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '2000n',
    //                    burnable: true,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    let signed: Pack = await sign_and_hash(definition_pack, make_signer(net.stabilizers[0].privkey));
    //    let {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const token_hash: string = createHash('sha256').update('token_', 'utf8').update(ok, 'base64url').update('_', 'utf8').update(definition_pack.body[0].nonce || DEFAULT_TOKEN_NONCE, 'hex').digest('base64url');
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //                type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                    [token_hash]: {
    //                        [net.stabilizers[0].address]: '2000n'
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await handle_incoming_pack(signed));
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const balance: bigint = await get_balance(db, net.stabilizers[0].address, token_hash);
    //    assert.strictEqual(balance, 2000n);
    //    const burn_pack: RawPack = {
    //        author: net.stabilizers[1].address,
    //        body: [
    //            <Transitions.Token_Burn>{
    //                type: TRANSITION_TYPES.BURN_TOKEN,
    //                burn: {
    //                    [token_hash]: '1000n'
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(burn_pack, make_signer(net.stabilizers[1].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.isUndefined(ok, "Invalid amount of tokens to burn");
    //    assert.strictEqual(err, "You are not an issuer of some token");
    //});
});