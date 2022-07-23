import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {DEFAULT_TOKEN_NONCE, GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash} from "crypto";
import Pack from "#classes/Pack";
import {buffer2string} from "#lib/serde";

describe('[Transitions] Issue asset', async function (){
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
        const issue_pack: Pack = await new Pack().issue(GENESIS_ACCOUNT_ADDRESS, token_hash, 50n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const bin3 = issue_pack.binary();
        ({ok, err} = await handle_incoming_pack(bin3));
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const {ok: token} = await db.get_token(token_hash);
        const new_balance = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, token_hash);
        assert.strictEqual(new_balance, 50n, "Balance was correctly increased");
        assert.strictEqual(token!.supply, 50n, "Token supply was correctly adjusted");
    });
    //TODO have a look
    //it('should not allow issuing the asset to a malformed address', async function () {
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
    //                type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                    [token_hash]: {
    //                        ['badidea']: '200n'
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.strictEqual(err, "Invalid to address");
    //    assert.isUndefined(ok, "No ok was returned");
    //});
    //it('should not allow issuing over the cap', async function () {
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
    //    for (let i=0;i<10;i++) {
    //        const issuing_pack: RawPack = {
    //            author: net.stabilizers[0].address,
    //            body: [
    //                <Transitions.Token_Issue>{
    //                    type: TRANSITION_TYPES.ISSUE,
    //                    issue: {
    //                        [token_hash]: {
    //                            [net.stabilizers[0].address]: '200n'
    //                        }
    //                    }
    //                }
    //            ]
    //        };
    //        const signed: Pack = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //        const {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //        assert.isUndefined(err, "No error was returned");
    //        assert.isString(ok, "The pack hash was returned");
    //        const balance: bigint = await get_balance(db, net.stabilizers[0].address, token_hash);
    //        assert.strictEqual(balance, 200n*BigInt(i+1));
    //    }
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //                type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                    [token_hash]: {
    //                        [net.stabilizers[0].address]: '200n'
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Cannot issue over the token cap");
    //    const balance: bigint = await get_balance(db, net.stabilizers[0].address, token_hash);
    //    assert.strictEqual(balance, 2000n);
    //});
    //it('should not allow issuing an inexistant token', async function () {
    //    for (let i=0;i<10;i++) {
    //        const issuing_pack: RawPack = {
    //            author: net.stabilizers[0].address,
    //            body: [
    //                <Transitions.Token_Issue>{
    //                    type: TRANSITION_TYPES.ISSUE,
    //                    issue: {
    //                        [randomBytes(32).toString('base64url')]: {
    //                            [net.stabilizers[0].address]: '200n'
    //                        }
    //                    }
    //                }
    //            ]
    //        };
    //        const signed: Pack = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //        const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //        assert.isUndefined(ok, "No ok was returned");
    //        assert.strictEqual(err, "Token not found");
    //    }
    //});
    //it('should not allow issuing a negative amount', async function () {
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
//
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //                type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                    [token_hash]: {
    //                        [net.stabilizers[0].address]: '-200n'
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.strictEqual(err, "Cannot issue a nonpositive amount of an asset");
    //    assert.isUndefined(ok, "No ok was returned");
    //});
    //it('should not allow issuing a token the sender is not a issuer of', async function () {
    //    const definition_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '2000n',
    //                    burnable: false,
    //                    issuers: [net.users[0].address],
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
//
    //    const issuing_pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Issue>{
    //                type: TRANSITION_TYPES.ISSUE,
    //                issue: {
    //                    [token_hash]: {
    //                        [net.users[0].address]: '200n'
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    signed = await sign_and_hash(issuing_pack, make_signer(net.stabilizers[0].privkey));
    //    ({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
    //    assert.strictEqual(err, "You cannot issue some token");
    //    assert.isUndefined(ok, "No ok was returned");
    //});
});