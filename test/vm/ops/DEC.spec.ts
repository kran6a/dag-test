import {EXCEPTIONS, OPS, Vm} from "#vm";
import {bigint2word, binary2bigint} from "#lib/serde";
import {assert} from "chai";
import {BALANCE_WIDTH_BYTES, MAX_INTEGER} from "#constants";
import {describe, it} from "mocha";

describe('[VM] DEC', ()=>{
    it("should decrement the stack's head by one", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.DEC]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 2n, 'Increment worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should properly handle overflows", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(0n), OPS.DEC]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), MAX_INTEGER, 'Increment worked');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});