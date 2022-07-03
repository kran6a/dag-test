import {EXCEPTIONS, OPS, Vm} from "#vm";
import {bigint2word, binary2bigint} from "#lib/serde";
import {assert} from "chai";
import {BALANCE_WIDTH_BYTES, BASE_TOKEN} from "#constants";
import {describe, it} from "mocha";

describe('[VM] INPUT', ()=>{
    it("should load the input amount", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(0n), OPS.INPUT]);
        const vm: Vm = new Vm(code, 'f', 256, [], new Map().set(BASE_TOKEN, 100n));
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 100n, 'Got the expected value');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should load zero when inputs are empty", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(0n), OPS.INPUT]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 0n, 'Got the expected value');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});