import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {bigint2word} from "#lib/serde";
import {MAX_CAP} from "#constants";

describe('[VM] TOKEN_DEF', ()=>{
    it('should push the token definition into the output', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH4, ...bigint2word(1n), ...bigint2word(1n), ...bigint2word(MAX_CAP/2n), ...bigint2word(1n), OPS.TOKEN_DEF]);
        const vm: Vm = new Vm(code, 'f', 25600, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isUndefined(ok, 'Nothing was returned');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');

        assert.isDefined(vm.output.r_token, 'VM output contains a token transition');
        assert.strictEqual(vm.output.r_token.payload[0].cap, MAX_CAP/2n, 'cap is correct');
        assert.strictEqual(vm.output.r_token.payload[0].nonce, 0, 'Nonce is properly set');
        assert.isTrue(vm.output.r_token.payload[0].burnable, 'Burnable is properly set');
        assert.lengthOf(vm.output.r_token.payload[0].issuers, 1, 'There is only one issuer');
        assert.strictEqual(vm.output.r_token.payload[0].issuers[0], '1'.padStart(64, '0'), 'The issuer is the 1 address');
    });
    it('should push an unburnable token definition into the output', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH4, ...bigint2word(1n), ...bigint2word(1n), ...bigint2word(MAX_CAP/2n), ...bigint2word(0n), OPS.TOKEN_DEF]);
        const vm: Vm = new Vm(code, 'f', 25600, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isUndefined(ok, 'Nothing was returned');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');

        assert.isDefined(vm.output.r_token, 'VM output has a token definition transition');
        assert.strictEqual(vm.output.r_token.payload[0].cap, MAX_CAP/2n, 'cap is correct');
        assert.strictEqual(vm.output.r_token.payload[0].nonce, 0, 'Nonce is properly set');
        assert.strictEqual(vm.output.r_token.payload[0].burnable, false, 'Burnable is properly set');
        assert.lengthOf(vm.output.r_token.payload[0].issuers, 1, 'There is only one issuer');
        assert.strictEqual(vm.output.r_token.payload[0].issuers[0], '1'.padStart(64, '0'), 'The issuer is the 1 address');
    });
    it('should push a token definition with two issuers into the output', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH5, ...bigint2word(2n), ...bigint2word(1n), ...bigint2word(2n), ...bigint2word(MAX_CAP/2n), ...bigint2word(0n), OPS.TOKEN_DEF]);
        const vm: Vm = new Vm(code, 'f', 25600, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isUndefined(ok, 'Nothing was returned');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');

        assert.isDefined(vm.output.r_token, 'VM output has a token definition transition');
        assert.strictEqual(vm.output.r_token.payload[0].cap, MAX_CAP/2n, 'cap is correct');
        assert.strictEqual(vm.output.r_token.payload[0].nonce, 0, 'Nonce is properly set');
        assert.isFalse(vm.output.r_token.payload[0].burnable, 'Burnable is properly set');
        assert.lengthOf(vm.output.r_token.payload[0].issuers, 2, 'There are two issuers');
        assert.strictEqual(vm.output.r_token.payload[0].issuers[0], '1'.padStart(64, '0'), 'The issuer is the 1 address');
        assert.strictEqual(vm.output.r_token.payload[0].issuers[1], '2'.padStart(64, '0'), 'The issuer is the 1 address');
    });
});