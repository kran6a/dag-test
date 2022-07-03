import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";
import {createHash} from "crypto";

describe('[VM] SHA512', ()=>{
    it('should SHA512 the input', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(5n), OPS.SHA512, 1]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.lengthOf(vm.stack, Math.ceil(64/BALANCE_WIDTH_BYTES-1), 'VM stack has the rest of the words');
        assert.strictEqual(Buffer.concat([...vm.stack, ok]).compare(Buffer.concat([Buffer.alloc(Math.max(BALANCE_WIDTH_BYTES - 64, 0)), createHash('sha512').update(bigint2word(5n)).digest()])), 0, 'SHA512 produced the expected result');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
    it('should SHA512 3 words', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH3, ...bigint2word(5n), ...bigint2word(5n), ...bigint2word(5n), OPS.SHA512, 3]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.lengthOf(vm.stack, Math.ceil(64/BALANCE_WIDTH_BYTES-1), 'VM stack has the rest of the words');
        assert.strictEqual(Buffer.concat([...vm.stack, ok]).compare(Buffer.concat([Buffer.alloc(Math.max(BALANCE_WIDTH_BYTES - 64, 0)), createHash('sha512').update(bigint2word(5n)).update(bigint2word(5n)).update(bigint2word(5n)).digest()])), 0, 'SHA512 produced the expected result');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
    it('should fail if word length is zero', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH, ...bigint2word(1n), OPS.SHA512, 0]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(ok, 'No result was produced');
        assert.strictEqual(err, EXCEPTIONS.BAD_SEQUENCE, 'VM returned a BAD_SEQUENCE exception');
        assert.strictEqual(vm.exception, EXCEPTIONS.BAD_SEQUENCE, 'VM produced a BAD_SEQUENCE exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
    });
});
