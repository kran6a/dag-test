import {EXCEPTIONS, OPS, Vm} from "#vm";
import {bigint2word, binary2bigint} from "#lib/serde";
import {assert} from "chai";
import {BALANCE_WIDTH_BYTES} from "#constants";
import {describe, it} from "mocha";

describe('[VM] CMP', ()=>{
    it("should be higher", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(3n), OPS.PUSH, ...bigint2word(4n), OPS.CMP]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isTrue(Buffer.isBuffer(ok), 'We got a buffer as response');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES, 'Buffer size is a word');
        assert.strictEqual(binary2bigint(ok), 2n, 'The comparison result is higher');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should be lower", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(4n), OPS.PUSH, ...bigint2word(3n), OPS.CMP]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isTrue(Buffer.isBuffer(ok), 'We got a buffer as response');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES, 'Buffer size is a word');
        assert.strictEqual(binary2bigint(ok), 0n, 'The comparison result is lower');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it("should be equal", async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(4n), OPS.PUSH, ...bigint2word(4n), OPS.CMP]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isTrue(Buffer.isBuffer(ok), 'We got a buffer as response');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES, 'Buffer size is a word');
        assert.strictEqual(binary2bigint(ok), 1n, 'The comparison result is equal');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});