import {EXCEPTIONS, OPS, Vm} from "#vm";
import {bigint2word, binary2bigint, int2qop} from "#lib/serde";
import {assert} from "chai";
import {BALANCE_WIDTH_BYTES} from "#constants";
import {describe, it} from "mocha";

describe('[VM] GOTO', ()=>{
    it("should change the pc", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.INC, OPS.GOTO, ...int2qop(9 + BALANCE_WIDTH_BYTES + 3), 42, 42, 42, 42, OPS.DEC]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 3n, 'GOTO worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should throw an exception when jumping to an out of bounds offset", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.INC, OPS.GOTO, 42, 42, 42, 42, 42, OPS.DEC]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.strictEqual(vm.exception, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'VM produced an illegal memory access exception');
        assert.strictEqual(err, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'An illegal memory access exception was returned');
        assert.isUndefined(ok, 'We got no response');
        assert.strictEqual(vm.pc, BALANCE_WIDTH_BYTES + 4, 'PC stopped incrementing past GOTO');
    });
});