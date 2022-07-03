import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {binary2bigint, bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";

describe('[VM] SHIFTL_I', ()=>{
    it('should calculate the remainder', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(8n), OPS.SHIFTL_I, ...bigint2word(1n)]);
        const vm: Vm = new Vm(code, 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 16n, 'The shift produced the expected result');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
