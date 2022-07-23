import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash} from "crypto";
import Pack from "#classes/Pack";

describe('[Transitions] Asset definition', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should work', async function () {
        const pack: Pack = await new Pack().token({cap: 200n, burnable: false, issuers: [GENESIS_ACCOUNT_ADDRESS], nonce: 42}).seal(GENESIS_ACCOUNT_PRIVKEY);
        const bin: Uint8Array = pack.binary();
        const {ok, err}: Option<string> = await handle_incoming_pack(bin);
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        const token_hash: string = createHash('sha256').update('token_', 'utf8')
        .update(<string>pack.r_hash, 'base64url')
        .update('_', 'utf8')
        .update(new Uint8Array([42]))
        .digest('base64url');
        const {ok: result_token} = await db.get_token(token_hash);
        assert.deepEqual(result_token, {cap: 200n, hash: token_hash, burnable: false, issuers: [GENESIS_ACCOUNT_ADDRESS], supply: 0n});
    });
    //TODO check this
    //it('should default cap to MAX_CAP and burnable to false when omitted', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const token_hash: string = createHash('sha256').update('token_', 'utf8').update(signed.hash, 'base64url').update('_', 'utf8').update(pack.body[0].nonce || DEFAULT_TOKEN_NONCE, 'hex').digest('base64url');
    //    const result_token: ParsedToken = await get_token(db, token_hash);
    //    assert.deepEqual(result_token, {cap: MAX_CAP, hash: token_hash, burnable: false, issuers: [net.stabilizers[0].address], supply: 0n});
    //});
    //it('should create two tokens', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [
    //                    {
    //                        issuers: [net.stabilizers[0].address],
    //                        nonce: DEFAULT_TOKEN_NONCE,
    //                    },
    //                    {
    //                        issuers: [net.stabilizers[0].address],
    //                        burnable: true,
    //                        nonce: '01'
    //                    }
    //                ]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    assert.isUndefined(err, "No error was returned");
    //    assert.isString(ok, "The pack hash was returned");
    //    const token_hash_1: string = createHash('sha256').update('token_', 'utf8').update(signed.hash, 'base64url').update('_', 'utf8').update(pack.body[0].tokens[0].nonce, 'hex').digest('base64url');
    //    const token_hash_2: string = createHash('sha256').update('token_', 'utf8').update(signed.hash, 'base64url').update('_', 'utf8').update(pack.body[0].tokens[1].nonce, 'hex').digest('base64url');
    //    const result_token_1: ParsedToken = await get_token(db, token_hash_1);
    //    const result_token_2: ParsedToken = await get_token(db, token_hash_2);
    //    assert.deepEqual(result_token_1, {cap: MAX_CAP, hash: token_hash_1, burnable: false, issuers: [net.stabilizers[0].address], supply: 0n});
    //    assert.deepEqual(result_token_2, {cap: MAX_CAP, hash: token_hash_2, burnable: true, issuers: [net.stabilizers[0].address], supply: 0n});
    //});
    //it('should not allow posting an asset with negative cap', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '-1n',
    //                    burnable: false,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Invalid token cap");
    //});
    //it('should not allow posting an asset with zero cap', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: '0n',
    //                    burnable: false,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Invalid token cap");
    //});
    //it('should not allow posting an asset with cap over the max', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: (MAX_CAP+1n).toString(10),
    //                    burnable: false,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Invalid token cap");
    //});
    //it('should not allow posting an asset with NaN cap', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: "abc",
    //                    burnable: false,
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Invalid token cap");
    //});
    //it('should not allow posting an asset with non boolean burnable', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            // @ts-ignore
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: "200n",
    //                    burnable: 'false',
    //                    issuers: [net.stabilizers[0].address],
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Burnable must be a boolean");
    //});
    //it('should not allow posting an asset without issuers field', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: "200n",
    //                    burnable: false,
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Issuers must be a non-empty array");
    //});
    //it('should not allow posting an asset with an empty issuers array', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: "200n",
    //                    issuers: [],
    //                    burnable: false,
    //                    nonce: DEFAULT_TOKEN_NONCE
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Issuers must be a non-empty array");
    //});
    //it('should not allow posting an asset with a bad nonce', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [{
    //                    cap: "200n",
    //                    issuers: [net.stabilizers[0].address],
    //                    burnable: false,
    //                    nonce: 'DEFAULT_TOKEN_NONCE'
    //                }]
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Nonce must be a hex string");
    //});
    //it('should not allow posting two assets with repeated nonces', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            <Transitions.Token_Definition>{
    //                type: TRANSITION_TYPES.DEFINE_TOKEN,
    //                tokens: [
    //                    {
    //                        cap: "200n",
    //                        issuers: [net.stabilizers[0].address],
    //                        burnable: false,
    //                        nonce: '00'
    //                    },
    //                    {
    //                        cap: "200n",
    //                        issuers: [net.stabilizers[0].address],
    //                        burnable: false,
    //                        nonce: '00'
    //                    }
    //                ]
//
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const {ok, err}: Option<string> = await maybe(handle_incoming_pack(signed), undefined, true);
    //    assert.isUndefined(ok, "No ok was returned");
    //    assert.strictEqual(err, "Nonces must be unique");
    //});
});