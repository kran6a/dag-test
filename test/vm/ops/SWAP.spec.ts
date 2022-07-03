import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {bigint2word, binary2bigint} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";

describe('[VM] SWAP', ()=>{
    it('should swap the stack head and pre-head', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(4n), OPS.PUSH, ...bigint2word(6n), OPS.SWAP]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 4n, 'Items were swapped');
        assert.lengthOf(vm.stack, 1, 'VM stack has one item left');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
    it('should fail when there is only one item in the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(4n), OPS.SWAP]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(ok, "No result was produced");
        assert.strictEqual(err, EXCEPTIONS.STACK_UNDERFLOW, 'An stack underflow exception was returned');
        assert.lengthOf(vm.stack, 2, 'VM stack has two item left (one is garbage)');
        assert.strictEqual(vm.exception, EXCEPTIONS.STACK_UNDERFLOW, 'VM produced an stack underflow exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
});
