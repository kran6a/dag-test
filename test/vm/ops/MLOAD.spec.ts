import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {BALANCE_WIDTH_BYTES, COMMUNITY_ADDRESS} from "#constants";
import {bigint2word, binary2bigint, int2dop} from "#lib/serde";

describe('[VM] MLOAD', ()=>{
    it('should push the sender address into the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(32n), OPS.MSTORE, ...int2dop(5), OPS.MLOAD, ...int2dop(5)]);
        const vm: Vm = new Vm(code, COMMUNITY_ADDRESS, 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(ok), 32n, 'The value was retrieved from the specified memory slot and pushed into the stack');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.strictEqual(vm.op_count, 4, '4 ops were executed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it('should fail to load from an out of bound slot', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(32n), OPS.MSTORE, ...int2dop(5), OPS.MLOAD, ...int2dop(1025)]);
        const vm: Vm = new Vm(code, COMMUNITY_ADDRESS, 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.strictEqual(err, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'An illegal memory access exception was returned');
        assert.isUndefined(ok, 'We got no response');
        assert.strictEqual(vm.exception, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'VM produced an illegal memory access exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.strictEqual(vm.op_count, 4, '4 ops were executed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});