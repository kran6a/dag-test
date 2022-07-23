import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {bigint2word} from "#lib/serde";
import {BASE_TOKEN, COMMUNITY_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {db} from "#db";
import Pack from "#classes/Pack";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {pay} from "#routines";
import Dapp from "#classes/DAPP";
import {is_ok} from "#lib/validation";

describe('[VM] PAY', ()=>{
    beforeEach(async ()=>{
        await db.initialize();
    });
    it('should push the payment into the output', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH3, ...bigint2word(BigInt('0x'+COMMUNITY_ADDRESS)), ...bigint2word(0n), ...bigint2word(42n), OPS.PAY]);
        const vm: Vm = new Vm(code, COMMUNITY_ADDRESS, 1300, []);
        const pack: Pack = await new Pack().pay(Dapp.compute_address(code), BASE_TOKEN, 100000n).seal(GENESIS_ACCOUNT_PRIVKEY);
        assert.isString((await handle_incoming_pack(pack.binary())).ok);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isUndefined(ok, 'Nothing was returned');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');

        assert.isDefined(vm.output.r_payment, 'VM output contains a payment');
        assert.strictEqual(vm.output!.r_payment!.to_address(COMMUNITY_ADDRESS).get(BASE_TOKEN), 42n, 'The community address received 42n');
    });
    it('should not allow paying more than the current smart contract balance', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH3, ...pay({amount: 42n, to: COMMUNITY_ADDRESS, token: BASE_TOKEN}), OPS.PAY]);
        const vm: Vm = new Vm(code, COMMUNITY_ADDRESS, 1300, []);
        const pack: Pack = await new Pack().pay(Dapp.compute_address(code), BASE_TOKEN, 100000n).seal(GENESIS_ACCOUNT_PRIVKEY);
        const opt: Option<string> = await pack.submit();
        assert.isTrue(is_ok(opt));


        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.strictEqual(err, EXCEPTIONS.NOT_ENOUGH_BALANCE);
        assert.isUndefined(ok, 'No ok was returned');
        assert.strictEqual(vm.exception, EXCEPTIONS.NOT_ENOUGH_BALANCE, 'VM produced a NOT_ENOUGH_BALANCE exception');
        assert.strictEqual(vm.pc, code.length -1, 'The execution halted on the PAY opcode');
    });
});