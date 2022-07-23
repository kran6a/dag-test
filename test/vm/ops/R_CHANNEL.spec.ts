import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {buffer2string} from "#lib/serde";
import {GENESIS_ACCOUNT_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {db} from '#db';
import Pack from '#classes/Pack';
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Channel from "#classes/Channel";
import {read_channel_by_owner} from "#routines";

describe('[VM] R_CHANNEL', ()=>{
    const channel_key: string = Channel.compute_key(GENESIS_ACCOUNT_ADDRESS, 'awesome_key');
    beforeEach(async function (){
        await db.initialize();
        const pack: Pack = await new Pack().channel('awesome_key', '42').seal(GENESIS_ACCOUNT_PRIVKEY);
        await handle_incoming_pack(pack.binary());
    });
    it('should push the value into the stack', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, ...read_channel_by_owner(GENESIS_ACCOUNT_ADDRESS, 'awesome_key')]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.lengthOf(<Uint8Array>ok, 2, 'The value stored in the channel is 2 bytes long');
        assert.strictEqual(buffer2string(<Uint8Array>ok, 'utf8'), '42', 'The value of that buffer is the value we pushed into the stack');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
    it('should fail gracefully when accessing an nonexistent channel', async function () {
        const code: Uint8Array = new Uint8Array([OPS.LABEL, ...read_channel_by_owner(GENESIS_ACCOUNT_ADDRESS, 'bad_key')]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.strictEqual(err, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'An illegal memory access exception is returned');
        assert.isUndefined(ok, 'We got no response');
        assert.strictEqual(vm.exception, EXCEPTIONS.ILLEGAL_MEMORY_ACCESS, 'The VM exception field is set to ILLEGAL_MEMORY_ACCESS');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
