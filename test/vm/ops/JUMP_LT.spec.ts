import {EXCEPTIONS, OPS, Vm} from "#vm";
import {bigint2word, binary2bigint, int2qop} from "#lib/serde";
import {assert} from "chai";
import {BALANCE_WIDTH_BYTES} from "#constants";
import {describe, it} from "mocha";

describe('[VM] JUMP_LT', ()=>{
    it("should change the pc", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(2n), OPS.JUMP_LT, ...int2qop(BALANCE_WIDTH_BYTES*2+12), 42, 42, 42, 42, OPS.PUSH, ...bigint2word(42n)]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 42n, 'JUMP_LT worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should throw an exception when jumping to an out of bounds offset", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(2n), OPS.JUMP_LT, ...int2qop(BALANCE_WIDTH_BYTES*3+14), 42, 42, 42, 42, OPS.PUSH, ...bigint2word(42n)]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.strictEqual(vm.exception, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'VM produced an illegal memory access exception');
        assert.strictEqual(err, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'An illegal memory access exception was returned');
        assert.isUndefined(ok, 'We got no response');
        assert.strictEqual(vm.pc, BALANCE_WIDTH_BYTES*2+4, 'PC stopped incrementing past JUMP_LT');
    });
    it("should not jump when operands are equal", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(3n), OPS.JUMP_LT, ...int2qop(BALANCE_WIDTH_BYTES*2+12), OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(42n)]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 42n, 'JUMP_LT worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 1, 'VM stack has an element remaining');
        assert.strictEqual(binary2bigint(vm.stack[0]), 3n, '3n is still inside the VM stack');
    });
    it("should not jump when A > B", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(4n), OPS.JUMP_LT, ...int2qop(BALANCE_WIDTH_BYTES*2+12), OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(42n)]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 42n, 'JUMP_LT worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 1, 'VM stack has an element remaining');
        assert.strictEqual(binary2bigint(vm.stack[0]), 3n, '3n is still inside the VM stack');
    });
});