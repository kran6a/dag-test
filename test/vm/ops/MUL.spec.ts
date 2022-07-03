import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {binary2bigint, bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES, MAX_INTEGER} from "#constants";

describe('[VM] MUL', ()=>{
    it('should multiply numbers without overflow', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(5n), OPS.PUSH, ...bigint2word(6n), OPS.MUL]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 30n, 'Multiplication is right');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it('should multiply numbers with overflow', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(MAX_INTEGER), OPS.PUSH, ...bigint2word(2n), OPS.MUL]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), MAX_INTEGER-1n, 'Multiplication is right');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
