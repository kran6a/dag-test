import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {EXCEPTIONS, OPS, Vm} from '#vm';
import {buffer2string, int2dop, string2buffer} from "#lib/serde";
import {db} from "#db";

describe('[VM] W_CHANNEL', ()=>{
    const CHANNEL_KEY: Uint8Array = string2buffer('test_channel', 'utf8');
    beforeEach(async ()=>{
        await db.initialize();
    });
    it(`should write the 1 byte value to the channel`, async function () {
        const CHANNEL_VALUE: Uint8Array = string2buffer('hello world!', 'utf8');
        const code: Uint8Array = new Uint8Array([
            OPS.LABEL,
            OPS.PUSH_B,
            ...int2dop(CHANNEL_KEY.length+CHANNEL_VALUE.length), //How many bytes to push
            ...[...CHANNEL_VALUE].reverse(), //Value
            ...[...CHANNEL_KEY].reverse(), //Key
            OPS.W_CHANNEL, //OP
            ...int2dop(CHANNEL_VALUE.length), //Value length
            ...int2dop(CHANNEL_KEY.length), //Key length
        ]);
        const vm: Vm = new Vm(code, 'f', 256, []);

        const {ok, err}: Option<Uint8Array, EXCEPTIONS> = await vm.execute();
        assert.isUndefined(err, 'No error was produced');
        assert.isUndefined(ok, 'No response was returned');
        assert.strictEqual(vm.output.r_channel.payload[buffer2string(CHANNEL_KEY, 'binary')], buffer2string(CHANNEL_VALUE, 'utf8'));
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});
