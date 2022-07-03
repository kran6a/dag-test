import {describe, it} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {BALANCE_WIDTH_BYTES, COMMUNITY_ADDRESS} from "#constants";
import {buffer2string} from "#lib/serde";

describe('[VM] SENDER', ()=>{
    it('should push the sender address into the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.SENDER]);
        const vm: Vm = new Vm(Buffer.from(code), COMMUNITY_ADDRESS, 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(buffer2string(ok.slice(-32), 'hex'), COMMUNITY_ADDRESS, 'The sender address was returned');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});