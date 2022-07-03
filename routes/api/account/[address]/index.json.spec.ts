import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from '#db';
import {get} from "./index.json.js";
import {ADDRESS_BYTE_LENGTH, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PUBKEY, PUBKEY_BYTE_LENGTH} from "#constants";
import {randomBytes} from "crypto";

describe('[API] /token/[hash].bin.ts', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    it('should return the base token info', async function () {
        const response = await get({params: {address: GENESIS_ACCOUNT_ADDRESS}});
        assert.strictEqual(response.status, 200, '200 status code was returned');
        assert.deepStrictEqual(response.headers, {
            "content-type": "text/plain",
            "cache-control": "public,immutable",
            "content-length": PUBKEY_BYTE_LENGTH*2
        });
        assert.strictEqual(response.body, GENESIS_ACCOUNT_PUBKEY);
    });
    it('should return 404 (NOT_FOUND)', async function () {
        const response = await get({params: {address: randomBytes(ADDRESS_BYTE_LENGTH).toString('hex')}});
        assert.strictEqual(response.status, 404, '404 status code was returned');
        assert.strictEqual(response.body, "Account not found");
    });
    it('should return 400 (BAD_REQUEST) (1)', async function () {
        const response = await get({params: {address: randomBytes(ADDRESS_BYTE_LENGTH-1).toString('hex')}});
        assert.strictEqual(response.status, 400, '404 status code was returned');
        assert.strictEqual(response.body, `Bad address length, expected ${ADDRESS_BYTE_LENGTH*2} characters`);
    });
    it('should return 400 (BAD_REQUEST) (2)', async function () {
        //@ts-expect-error
        const response = await get({params: {address: 3333}});
        assert.strictEqual(response.status, 400, '404 status code was returned');
        assert.strictEqual(response.body, "Address must be a string");
    });
});