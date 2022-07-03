import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {bigint2word, binary2bigint} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";

describe('[VM] SWAP2', ()=>{
    it('should swap the stack head and pre-head', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH3, ...bigint2word(1n), ...bigint2word(2n), ...bigint2word(3n), OPS.SWAP2, OPS.DUP]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 1n, 'The returned response was the expected value');
        assert.lengthOf(vm.stack, 3, 'VM stack has three items');
        assert.strictEqual(binary2bigint(vm.stack[0]), 3n, 'The first stack item is 3n');
        assert.strictEqual(binary2bigint(vm.stack[1]), 2n, 'The second stack item is 2n');
        assert.strictEqual(binary2bigint(vm.stack[2]), 1n, 'The third stack item is 1n');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
    it('should fail when there is only two items in the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH2, ...bigint2word(1n), ...bigint2word(2n), OPS.SWAP2, OPS.DUP]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(ok, "No result was produced");
        assert.strictEqual(err, EXCEPTIONS.STACK_UNDERFLOW, 'An stack underflow exception was returned');
        assert.lengthOf(vm.stack, 2, 'VM stack has two item left (one is garbage)');
        assert.strictEqual(vm.exception, EXCEPTIONS.STACK_UNDERFLOW, 'VM produced an stack underflow exception');
        assert.strictEqual(vm.pc, code.length - 1, 'Execution halted on the SWAP2 opcode');
    });
    it('should fail when there is only one item in the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(1n), OPS.SWAP2, OPS.DUP]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(ok, "No result was produced");
        assert.strictEqual(err, EXCEPTIONS.STACK_UNDERFLOW, 'An stack underflow exception was returned');
        assert.lengthOf(vm.stack, 1, 'VM stack has two item left (one is garbage)');
        assert.strictEqual(vm.exception, EXCEPTIONS.STACK_UNDERFLOW, 'VM produced an stack underflow exception');
        assert.strictEqual(vm.pc, code.length - 1, 'Execution halted on the SWAP2 opcode');
    });
});
