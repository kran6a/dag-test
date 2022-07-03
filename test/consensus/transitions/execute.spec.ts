import {beforeEach, describe, it} from 'mocha';
import {assert} from 'chai';
import {db} from "#db";
import {BASE_TOKEN, BINARY_ZERO, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PRIVKEY, GENESIS_ACCOUNT_PUBKEY} from "#constants";
import {OPS} from "#lib/vm/ops";
import {pay} from "#lib/vm/routines";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import {bigint2word, int2qop} from "#lib/serde";
import Pack from "#classes/Pack";
import Dapp from "#classes/DAPP";
import {is_ok} from "#lib/validation";
import {silence} from "#lib/logger";

describe('[Transitions] Execute', async function (){
    const pay_code: number[] = pay({amount: [OPS.POP], to: [OPS.SENDER], token: BASE_TOKEN});
    const code: number[] = [OPS.LABEL, OPS.PUSH, ...bigint2word(100_000n), OPS.DUP, OPS.JUMP_GT, ...int2qop(40+pay_code.length), ...pay_code];
    const dapp_address: string = Dapp.compute_address(code);
    silence('DB', 'Consensus');
    beforeEach(async function(){
        await db.initialize({stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: 100n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 1_000_000n}});
        const pack: Pack = await new Pack().dapp(code).seal(GENESIS_ACCOUNT_PRIVKEY);
        const opt: Option<string> = await handle_incoming_pack(pack.binary());
        assert.isTrue(is_ok(opt), 'No error was thrown');
    });
    it('should charge fees to the sender even if the execution fails', async function () {
        const pack: Pack = await new Pack().execute(dapp_address, [bigint2word(100_000n)], 1300).seal(GENESIS_ACCOUNT_PRIVKEY);
        const initial_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const bin: Uint8Array = pack.binary();
        const opt: Option<string> = await handle_incoming_pack(bin);
        assert.isTrue(is_ok(opt), "The pack got accepted");
        const commissions: bigint = await pack.get_commissions();
        assert.strictEqual(await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN), initial_balance - 1300n - commissions, 'Commissions have been charged');
    });
    it('should work', async function(){
        //const pay_code: number[] = pay({amount: [OPS.ADD], to: [OPS.SENDER], token: BASE_TOKEN});
        const pay_code: number[] = [
            //Amount is already in the stack
            OPS.SENDER, //To
            OPS.PUSH, ...bigint2word(0n), //Token
            OPS.SWAP,
            OPS.SWAP2,
            OPS.PAY
        ]
        const code: number[] = [OPS.LABEL, OPS.ADD, ...pay_code];
        const dapp_address: string = Dapp.compute_address(code);
        { //Deploy the dapp
            const pack: Pack = await new Pack().dapp(code).seal(GENESIS_ACCOUNT_PRIVKEY);
            const opt: Option<string> = await pack.submit();
            assert.isTrue(is_ok(opt), 'The pack was accepted');
            assert.isTrue((await db.get_pack(<string>opt.ok)).ok?.stable, 'The pack is stable');
        }
        { //Fund the Dapp
            const pack: Pack = await new Pack().pay(dapp_address, BASE_TOKEN, 700_000n).seal(GENESIS_ACCOUNT_PRIVKEY);
            const opt: Option<string> = await pack.submit();
            assert.isTrue(is_ok(opt), 'The pack was accepted');
            assert.isTrue((await db.get_pack(<string>opt.ok)).ok?.stable, 'The pack is stable');
            assert.strictEqual(await db.get_balance(dapp_address, BASE_TOKEN), 700_000n, 'The Dapp was funded');
        }
        const initial_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        const pack: Pack = await new Pack().execute(dapp_address, [BINARY_ZERO, bigint2word(100_000n), bigint2word(200_000n)], 1300).seal(GENESIS_ACCOUNT_PRIVKEY);
        const commissions: bigint = await pack.get_commissions();
        const opt: Option<string> = await pack.submit();
        assert.isTrue(is_ok(opt), "The pack was accepted");
        assert.isTrue((await db.get_pack(<string>pack.r_hash)).ok?.stable, 'The pack is stable');
        const final_balance: bigint = await db.get_balance(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN);
        assert.strictEqual(final_balance, initial_balance - commissions - 1300n + 300_000n, 'Payment was executed');
    })
});