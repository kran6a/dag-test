import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {BASE_TOKEN, COMMUNITY_ADDRESS, GENESIS_ACCOUNT_ADDRESS, GENESIS_UNIT_HASH} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {db} from '#db';
import Pack from "#classes/Pack";
import {get} from "./[hash].json.js";
import {randomBytes} from "crypto";
import {is_ok} from "#lib/validation";

describe('[API] [hash].json.ts', ()=>{
    let hash: string;
    beforeEach(async function(){
        await db.initialize();
        const pack: Pack = await new Pack().pay(COMMUNITY_ADDRESS, BASE_TOKEN, 100n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const opt: Option<string> = await pack.submit();
        assert.isTrue(is_ok(opt), 'A pack was rejected');
        hash = <string>pack.r_hash;
    });
    it('should match the generated pack', async function () {
        const response = await get({params: {hash}});
        assert.deepStrictEqual(response.headers, {'cache-control': 'public,immutable', 'content-type': 'application/json', 'content-length': response.body.length}, 'Headers match');
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(
            JSON.parse(response.body),
            {
                author: GENESIS_ACCOUNT_ADDRESS,
                parents: [GENESIS_UNIT_HASH],
                milestone: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                sig: "9_3CM0YYFSZkw1lleRYENVNPXHdeXAjXMLJk2_Ht8zw_tKZKxh7i8UCAnnccrPrrU3Cr2OVYLXuinpNc1rFwCg",
                stable: true,
                size: 260,
                payment: {
                    [BASE_TOKEN]: {
                        [COMMUNITY_ADDRESS]: "100n"
                    }
                }
            });
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