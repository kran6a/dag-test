import {describe, it, beforeEach} from 'mocha';
import {assert} from 'chai';
import {OPS, Vm} from '#vm';
import {binary2bigint, bigint2word, int2qop} from "#lib/serde";
import {BALANCE_WIDTH_BYTES, GENESIS_ACCOUNT_PRIVKEY} from "#constants";
import {db} from '#db';
import Pack from "#classes/Pack";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Dapp from "#classes/DAPP";
import {is_ok} from "#lib/validation";

describe('[VM] CALL', ()=>{
    const sum_code: number[] = [OPS.LABEL, OPS.ADD, OPS.RETURN];
    beforeEach(async function(){
        await db.initialize();
        const pack = await new Pack().dapp(sum_code).seal(GENESIS_ACCOUNT_PRIVKEY);
        await handle_incoming_pack(pack.binary());
    })
    it('should CALL foreign code', async function () {
        const address: string = Dapp.compute_address(sum_code);
        const code: Uint8Array = new Uint8Array([OPS.LABEL, OPS.PUSH2, ...bigint2word(12n), ...bigint2word(30n), OPS.CALL, ...bigint2word(BigInt('0x'+address)), ...int2qop(0), 2]);
        const vm: Vm = new Vm(Buffer.from(code), 'f', 256, []);

        const opt: Option<Uint8Array, number> = await vm.execute();
        console.log(opt);
        assert.isTrue(is_ok(opt), 'No error was produced');
        assert.lengthOf(<NonUndefined<Uint8Array>>opt.ok, BALANCE_WIDTH_BYTES);
        assert.strictEqual(binary2bigint(<NonUndefined<Uint8Array>>opt.ok), 42n, 'CALL produced the expected result');
        assert.isUndefined(vm.exception, 'VM produced no exception');
        assert.strictEqual(vm.pc, code.length, 'VM code tape was consumed');
        assert.lengthOf(vm.stack, 0, 'VM stack is empty');
    });
});