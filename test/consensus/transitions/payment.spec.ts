import {describe, beforeEach, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {BASE_TOKEN, GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {string2buffer} from "#lib/serde";
import {randomBytes} from "crypto";
import Pack from "#classes/Pack";

describe('[Transitions] Payment', async function (){
    beforeEach(async function(){
        await db.initialize();
    });
    it('should accept a payment of an inexistent token', async function () {
        const receiver: string = randomBytes(32).toString("hex");
        const amount: bigint = 1000n;
        const token: string = randomBytes(32).toString('base64url');
        const initial_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const pack: Pack = await new Pack().pay(receiver, token, amount).seal(GENESIS_ACCOUNT_PRIVKEY);

        const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary());
        assert.isUndefined(err, "No error was produced");
        assert.strictEqual(await db.get_balance(receiver, token), 0n);
        assert.strictEqual(await db.get_balance(<string>pack.r_author, BASE_TOKEN), initial_balance - await pack.get_commissions());
        assert.isString(ok);
        assert.lengthOf(string2buffer(<string>ok, 'base64url'), 32);
    });
    //TODO rework these tests
    //it('should accept a normal payment', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            {
    //                type: 9,
    //                "payment": {
    //                    "base": {
    //                        [net.users[0].address]: "1000n"
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const previous_sender_base_balance: bigint = await get_balance(db, net.stabilizers[0].address);
//
    //    const {ok, err}: Option<string> = await handle_incoming_pack(signed);
//
    //    const receiver_balance: bigint = await get_balance(db, net.users[0].address, BASE_TOKEN);
    //    const sender_balance: bigint = await get_balance(db, net.stabilizers[0].address, BASE_TOKEN);
    //    const stable_pack: Pack = await get_pack(db, ok);
    //    const commission: bigint = BigInt(toJSON(stable_pack).length);
    //    const cashback_due_stabilizer_status: bigint = BigInt(toJSON(stable_pack).length)*1n/(BigInt(net.stabilizers.length) + 1n);
    //    const total_commission: bigint = commission - cashback_due_stabilizer_status;
    //    assert.isUndefined(err, "No error was returned");
    //    assert.strictEqual(stable_pack.index, '1n', "The pack stabilized with index 1");
    //    assert.strictEqual(sender_balance, previous_sender_base_balance - 1000n - total_commission, "Sender balance was reduced as expected");
    //    assert.strictEqual(receiver_balance, 1000n, "Receiver balance was increased as expected");
    //});
    //it('should accept a normal payment with multiple outputs', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            {
    //                type: 9,
    //                "payment": {
    //                    "base": {
    //                        [net.users[0].address]: "1000n",
    //                        [net.users[1].address]: "1000n"
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const previous_sender_base_balance: bigint = await get_balance(db, net.stabilizers[0].address);
//
    //    const {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    const receiver1_balance: bigint = await get_balance(db, net.users[0].address, BASE_TOKEN);
    //    const receiver2_balance: bigint = await get_balance(db, net.users[1].address, BASE_TOKEN);
    //    const sender_balance: bigint = await get_balance(db, net.stabilizers[0].address, BASE_TOKEN);
    //    const stable_pack: Pack = await get_pack(db, ok);
    //    const commission: bigint = BigInt(toJSON(stable_pack).length);
    //    const cashback_due_stabilizer_status: bigint = BigInt(toJSON(stable_pack).length)*1n/(BigInt(net.stabilizers.length) + 1n);
    //    const total_commission: bigint = commission - cashback_due_stabilizer_status;
    //    assert.isUndefined(err, "No error was returned");
    //    assert.strictEqual(stable_pack.index, '1n', "The pack stabilized with index 1");
    //    assert.strictEqual(sender_balance, previous_sender_base_balance - 2000n - total_commission, "Sender balance was reduced as expected");
    //    assert.strictEqual(receiver2_balance, 1000n, "Receiver 2 balance was increased as expected");
    //    assert.strictEqual(receiver1_balance, 1000n, "Receiver 1 balance was increased as expected");
    //});
    //it('should accept a normal payment with multiple assets and multiple outputs', async function () {
    //    const pack: RawPack = {
    //        author: net.stabilizers[0].address,
    //        body: [
    //            {
    //                type: 9,
    //                "payment": {
    //                    [net.tokens[0].hash]: {
    //                        [net.users[0].address]: "2n",
    //                        [net.users[1].address]: "3n"
    //                    },
    //                    "base": {
    //                        [net.users[0].address]: "1000n",
    //                        [net.users[1].address]: "1000n"
    //                    }
    //                }
    //            }
    //        ]
    //    };
    //    const signed: Pack = await sign_and_hash(pack, make_signer(net.stabilizers[0].privkey));
    //    const previous_sender_base_balance: bigint = await get_balance(db, net.stabilizers[0].address);
//
    //    const {ok, err}: Option<string> = await handle_incoming_pack(signed);
    //    const sender_base_balance: bigint = await get_balance(db, net.stabilizers[0].address, BASE_TOKEN);
    //    const receiver1_base_balance: bigint = await get_balance(db, net.users[0].address, BASE_TOKEN);
    //    const receiver2_base_balance: bigint = await get_balance(db, net.users[1].address, BASE_TOKEN);
//
    //    const sender_token_balance: bigint = await get_balance(db, net.stabilizers[0].address, net.tokens[0].hash);
    //    const receiver1_token_balance: bigint = await get_balance(db, net.users[0].address, net.tokens[0].hash);
    //    const receiver2_token_balance: bigint = await get_balance(db, net.users[1].address, net.tokens[0].hash);
    //    const stable_pack: Pack = await get_pack(db, ok);
    //    const commission: bigint = BigInt(toJSON(stable_pack).length);
    //    const cashback_due_stabilizer_status: bigint = BigInt(toJSON(stable_pack).length)*1n/(BigInt(net.stabilizers.length) + 1n);
    //    const total_commission: bigint = commission - cashback_due_stabilizer_status;
    //    assert.isUndefined(err, "No error was returned");
    //    assert.strictEqual(stable_pack.index, '1n', "The pack stabilized with index 1");
//
    //    assert.strictEqual(sender_base_balance, previous_sender_base_balance - 2000n - total_commission, "Sender balance was reduced as expected");
    //    assert.strictEqual(receiver1_base_balance, 1000n, "Receiver 1 balance was increased as expected");
    //    assert.strictEqual(receiver2_base_balance, 1000n, "Receiver 2 balance was increased as expected");
//
    //    assert.strictEqual(sender_token_balance, net.tokens[0].cap - 5n, "Sender token balance was reduced as expected");
    //    assert.strictEqual(receiver1_token_balance, 2n, "Receiver 1 token balance was increased as expected");
    //    assert.strictEqual(receiver2_token_balance, 3n, "Receiver 2 token balance was increased as expected");
    //});
});
