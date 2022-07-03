import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {binary2bigint, bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES, MAX_CAP} from "#constants";

describe('[VM] ADD', ()=>{
    it('should sum numbers without overflow', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(5n), OPS.PUSH, ...bigint2word(4n), OPS.ADD]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 9n, 'Sum is right');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it('should sum numbers with overflow', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(MAX_CAP-1n), OPS.PUSH, ...bigint2word(2n), OPS.ADD]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 1n, 'Sum is right');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
