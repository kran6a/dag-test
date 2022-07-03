import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_PRIVKEY} from "#constants";
import {db} from '#db';
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Pack from "#classes/Pack";
import {get} from "./[hash].bin.js";
import {randomBytes} from "crypto";

describe('[API] [hash].json.ts', ()=>{
    let hash: string;
    beforeEach(async function(){
        await db.initialize();
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY);
        await handle_incoming_pack(pack.binary());
        hash = pack.r_hash;
    });
    it('should match the generated pack', async function () {
        const response = await get({params: {hash}}) as { headers: { "content-length": number; "content-type": string; "cache-control": string }; body: Uint8Array; status: number };
        assert.deepStrictEqual(response.headers, {'cache-control': 'public,immutable', 'content-type': 'application/octet-stream', 'content-length': response.body.length}, 'Headers match');
        assert.strictEqual(response.status, 200, '200 status code was returned');
        const {ok: pack, err: _} = await db.get_pack(hash);
        const expected: Uint8Array = pack.binary();
        assert.deepStrictEqual(
            Array.from(response.body),
            Array.from(expected)
        )
    });
    it ('should return a 400 (MALFORMED_REQUEST) code (1)', async function(){
        const response = await get({params: {hash: '66'}});
        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.headers, {'cache-control': 'public,immutable', 'content-type': 'text/plain', 'content-length': 28});
        assert.strictEqual(response.body, 'Bad hash length, expected 43');
    });
    it ('should return a 400 (MALFORMED_REQUEST) code (2)', async function(){
        //@ts-expect-error
        const response = await get({params: {hash: 66}});
        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.headers, {'cache-control': 'public,immutable', 'content-type': 'text/plain', 'content-length': 21});
        assert.strictEqual(response.body, 'Hash must be a string');
    });
    it ('should return a 404 (NOT_FOUND) code', async function(){
        const response = await get({params: {hash: randomBytes(32).toString('base64url')}});
        assert.strictEqual(response.status, 404);
        assert.deepStrictEqual(response.headers, {'cache-control': 'public,max-age=60', 'content-type': 'text/plain', 'content-length': 14});
        assert.strictEqual(response.body, 'Pack not found');
    });
});