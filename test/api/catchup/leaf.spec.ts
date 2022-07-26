import {get} from '#routes/api/catchup/[leaf].json';
import {describe} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {createHash} from "crypto";
import handle_incoming_pack from "#lib/handle_incoming_pack";

const hash = (str: string): string=>createHash('sha256').update(str).digest('base64url');
//TODO implement
describe('[API] catchup', ()=>{
    beforeEach(async function(){
        await db.initialize();
    });
    //it('should return two parents', async function () {
    //    const packs: Record<string, Partial<Pack>> = {
    //        genesis: {hash: hash("genesis"), parents: []},
    //        '1': {hash: hash("1"), parents: [hash("genesis")]},
    //        '2': {hash: hash("2"), parents: [hash("1")]},
    //        '3': {hash: hash("3"), parents: [hash("2"), hash("genesis")]}
    //    }
    //    handle_incoming_pack(x);
    //    await Promise.all(Object.values(packs).map(x=>save_pack(db, <Pack>x)));
    //    const response = await get({params: {leaf: hash('3')}}, db);
    //    assert.strictEqual(response.status, 200, 'OK was returned');
    //    assert.deepStrictEqual(JSON.parse(response.body), [packs["2"], packs['genesis']], "The expected parents were returned");
    //    assert.lengthOf(response.body, response.headers['content-length'], "content-length header is correct");
    //    assert.strictEqual(response.headers['content-type'], 'application/json', 'Mimetype is correctly set');
    //    assert.strictEqual(response.headers["cache-control"], 'public,immutable', "Cache control is set");
    //});
    //it('should return error code 500', async function () {
    //    const db: RocksDBTransaction = mock_db().batch();
    //    const response = await get({params: {leaf: hash('3')}}, db);
    //    assert.strictEqual(response.status, 500, 'Server error was returned');
    //});
    //it('should return error code 400', async function () {
    //    const db: RocksDBTransaction = mock_db().batch();
    //    // @ts-ignore
    //    const response = await get({params: {leaf: 1}}, db);
    //    assert.strictEqual(response.status, 400, 'Client error was returned');
    //});
});
