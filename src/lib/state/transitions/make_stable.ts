import {BASE_TOKEN, COMMUNITY_ADDRESS} from "#constants";
import {db} from "#db";
import {is_sequential} from "#lib/validation";
import Payment from "#classes/Payment";
import type Pack from "#classes/Pack";
import {log} from "#lib/logger";

/**
 * @description Adds commission payment outputs into the pack body
 * @description These outputs are not saved in the DB since they can be reproduced from the stored pack
 * @param pack The pack
 * @returns The pack with added (or updated) payment transition outputs
 */
const add_pack_commissions = async (pack: Pack): Promise<Pack>=>{
    const stabilizers: Map<string, bigint> = await db.get_stabilizers();
    const base: bigint = BigInt(pack.binary().length);
    let total_charged = 0n;
    if (!pack.r_payment) //The pack does not include payments, let's add an empty payment transition
        pack.r_payment = new Payment();
    for (const stabilizer_address of stabilizers.keys()) { //Update outputs
        if (stabilizer_address === pack.r_author)
            continue;
        total_charged+=base;
        pack.pay(stabilizer_address, BASE_TOKEN, base);
    }
    //Add last output to the community fund
    pack.pay(COMMUNITY_ADDRESS, BASE_TOKEN, base);
    return pack;
}

/**
 * @description Evaluates a stabilized packs to apply its transitions to the state
 * @param pack The pack that got stable
 * @param is_smart_contract_call
 */
export default async (pack: Pack, is_smart_contract_call: boolean = false): Promise<void>=>{
    db.set_stable(pack);       //Set the stable property
    const current_milestone: string = await db.get('milestone');
    if (pack.r_milestone !== current_milestone) //We only accept units from the last milestone
        return;
    if (!await is_sequential(pack)) {
        const [sender_balance, community_balance]: [bigint, bigint] = await Promise.all([db.get_balance(<string>pack.r_author, BASE_TOKEN), db.get_balance(COMMUNITY_ADDRESS, BASE_TOKEN)]);
        db.set_balance(COMMUNITY_ADDRESS, BASE_TOKEN, community_balance + sender_balance);
        db.set_balance(<string>pack.r_author, BASE_TOKEN, community_balance + sender_balance);
        return db.set_stable(pack); //Nonserial packs become stable automatically
    }

    //Add taxes to the pack since we can only process one charge/deposit per account and token
    if (!is_smart_contract_call)
        pack = await add_pack_commissions(pack);
    await pack.apply();
    db.put("last_stable", <string>pack.r_hash);                                                                                          //Update last known stable unit
    log('Consensus', 'INFO', `Stabilizing ${pack.r_hash}`);
};