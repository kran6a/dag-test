import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./[token].txt.js";
import {BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS, GENESIS_BALANCE, GENESIS_SUPPORT} from "#constants";
import {randomBytes} from "crypto";

describe('[API] /account/[address]/balance/[token].txt.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the correct balance', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS, token: BASE_TOKEN}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {'content-type': 'text/plain', 'content-length': response.body.length, 'cache-control': 'no-store'});
        assert.deepStrictEqual(response.body, (GENESIS_BALANCE - GENESIS_SUPPORT).toString());
    });
    it('should return 0 balance for nonexistent tokens ', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS, token: randomBytes(32).toString('base64url')}});
        assert.strictEqual(response.status, 200, '404 status code was returned');
        assert.deepStrictEqual(response.body, '0');
    });
    it('should return 0 balance for nonexistent addresses ', async function () {
        const response = await get({params: {address: randomBytes(32).toString('hex'), token: BASE_TOKEN}});
        assert.strictEqual(response.status, 200, '404 status code was returned');
        assert.deepStrictEqual(response.body, '0');
    });
});