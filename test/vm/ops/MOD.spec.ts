import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {binary2bigint, bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";

describe('[VM] MOD', ()=>{
    it('should calculate the remainder', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH2, ...bigint2word(6n), ...bigint2word(93837n), OPS.MOD]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);
        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 3n, 'The remainder is right');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
