import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db, get_state_hash} from "#db";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import Pack from "#classes/Pack";
import secp256k1 from "secp256k1";
import {buffer2string, string2buffer} from "#lib/serde";

describe('[Transitions] Milestone', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should post a milestone pack', async function () {
        const state_hash: string = await get_state_hash();
        const sigs: string[] = [buffer2string(secp256k1.ecdsaSign(string2buffer(state_hash, 'hex'), string2buffer(GENESIS_ACCOUNT_PRIVKEY, 'hex')).signature, 'base64url')];
        const pack: Pack = await new Pack().milestone(sigs, state_hash).seal(GENESIS_ACCOUNT_PRIVKEY);

        let {ok, err}: Option<string> = await pack.submit();
        assert.isUndefined(err, "No error was returned");
        assert.isString(ok, "The pack hash was returned");
        assert.strictEqual(await db.get_milestone(), ok, 'milestone was updated');
        //TODO check that new units can only reference this milestone and not the previous
        //pack = {
        //    author: net.stabilizers[0].address,
        //    body: [
        //        <Transitions.Account>{
        //            type: TRANSITION_TYPES.ACCOUNT,
        //            pubkeys: [randomBytes(33).toString('hex')]
        //        }
        //    ],
        //    parents: JSON.parse(await db.get('leaves')),
        //    milestone: await db.get('previous_milestone')
        //};
        //signed = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
        //({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
        //assert.isUndefined(ok, "No ok was returned");
        //assert.strictEqual(err, "The pack references parents from a single milestone but its milestone is not that of the parents", "An error was returned");
        //pack = {
        //    author: net.stabilizers[0].address,
        //    body: [
        //        <Transitions.Account>{
        //            type: TRANSITION_TYPES.ACCOUNT,
        //            pubkeys: [randomBytes(33).toString('hex')]
        //        }
        //    ],
        //    parents: JSON.parse(await db.get('leaves')),
        //};
        //signed = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
        //({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
        //assert.isUndefined(err, "No error was thrown");
        //assert.isString(ok, "The pack hash was returned");
        //pack = {
        //    author: net.stabilizers[0].address,
        //    body: [
        //        <Transitions.Account>{
        //            type: TRANSITION_TYPES.ACCOUNT,
        //            pubkeys: [randomBytes(33).toString('hex')]
        //        }
        //    ],
        //    parents: [await db.get('milestone'), await db.get('previous_milestone')].sort((a: string, b: string)=>BigInt('0x'+Buffer.from(a, 'base64url').toString('hex')) < BigInt('0x'+Buffer.from(b, 'base64url').toString('hex')) ? -1 : 1),
        //    milestone: await db.get('previous_milestone')
        //};
        //signed = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
        //({ok, err} = await maybe(handle_incoming_pack(signed), undefined, true));
        //assert.isUndefined(ok, "No ok was returned");
        //assert.strictEqual(err, "The pack references parents from the two latest milestones. However the pack milestone is set to the oldest one");
    });
});