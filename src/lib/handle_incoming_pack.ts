import {BASE_TOKEN, DB_MAX_SQL_RETRIES, DB_PARENTHOOD_QUERY_TIMEOUT, TRANSITION_TYPES} from "#constants";
import {toJSON} from "#lib/serde";
import get_stabilization_chain, {get_dag_weight} from './state/stabilization_chain.js';
import make_stable from './state/transitions/make_stable.js';
import {
    are_all_parents_known,
    are_parents_valid,
    is_sequential,
    is_pack_known,
    is_valid_pack_signature,
    is_ok
} from '#lib/validation';
import {Mutex} from "async-mutex";
import {db} from "#db";
import {broadcast_pack, query_pack} from "#network";
import Pack from "#classes/Pack";
import Database from "better-sqlite3";
import type {Database as Sqlite} from 'better-sqlite3';
import retry from "./functional/retry";
const parenthoods: Sqlite = new Database(process.env.PARENTHOOD_DB_NAME || './sqlite.db', {timeout: DB_PARENTHOOD_QUERY_TIMEOUT});

const mtx: Mutex = new Mutex(); //Only one pack is processed at a time

type RET_TYPE = Promise<Option<string>>;

//TODO check if the sender has enough balance
//const how_much_is_needed = (pack: Pack)=>{
//    const fees: bigint = BigInt(pack.binary().length);
//    const payment_outputs: bigint = pack.r_payment.sum(BASE_TOKEN);
//    return fees+payment_outputs;
//}
const handler = async (pack: Pack): Promise<void>=>{
    const [public_key, current_milestone, old_milestone]: [string, string, string] = await Promise.all([db.get_pubkey(<string>pack.r_author), db.get_milestone(), db.get_previous_milestone()]);
    if (!public_key)
        throw new Error("Unknown pack issuer");

    const SENDER_BALANCE: bigint = await db.get_balance(<string>pack.r_author, BASE_TOKEN) - BigInt(toJSON(pack).length);
    if (SENDER_BALANCE < pack.binary().length)
        throw new Error("Not enough balance to cover the fees");
    if (!are_parents_valid(pack))
        throw new Error("Invalid parent array");
    if (!is_valid_pack_signature(pack, public_key))
        throw new Error("Invalid pack signature");
    const are_parents_known: boolean = await are_all_parents_known(pack);
    const stabilizers: Map<string, bigint> = await db.get_stabilizers();
    if (!are_parents_known){
        if (stabilizers.has(<string>pack.r_author)){
            for (const parent of pack.r_parents){ //TODO collect the parents before locking the mutex so that we can process other packs while querying the parents
                const is_known: boolean = await is_pack_known(parent);
                if (!is_known){
                    const pack: Pack = await query_pack(parent);
                    await wrapper(pack.binary(), {processing_parent: true, relay: false});
                }
            }
        }
        else
            throw new Error("Some parents are not known");
    }

    const parent_hashes: ({ok: Pack})[] = <({ok: Pack})[]>await Promise.all(pack.r_parents.map((x: string)=>db.get_pack(x))); //TODO we are fetching parents twice (even if they are memoized)
    const parent_milestones: Set<string> = new Set<string>(<string[]>(parent_hashes.map(x=>x.ok)).map((x: Pack)=>x.r_milestone_transition ? x.r_hash : x.r_milestone || current_milestone));
    if (parent_milestones.size > 2) //Packs referencing parents from 3 milestones are not allowed, we only keep 2 milestones in the DB
        throw new Error("The pack references parents from more than two different milestones while only 2 are kept in the database as per the protocol");
    if (parent_milestones.size === 2 && (!parent_milestones.has(current_milestone) || !parent_milestones.has(old_milestone))) //Packs referencing parents from 2 milestones that are not the two latest milestones are not allowed
        throw new Error("The pack references parents from two milestones that are not the latest ones");
    if (parent_milestones.size === 2 && pack.r_milestone !== current_milestone) //Packs referencing parents from two milestones must reference the latest milestone
        throw new Error("The pack references parents from the two latest milestones. However the pack milestone is set to the oldest one");
    if (parent_milestones.size === 1 && pack.r_milestone !== parent_milestones.values().next().value) //Packs referencing parens from a single milestone must reference the latest milestone
        throw new Error("The pack references parents from a single milestone but its milestone is not that of the parents");

    if (!await is_sequential(pack))                     //We need to check this also during stabilization since we might not be aware of some leaves that could make it unsequential
        throw new Error("The pack is not sequential");

    db.set_pack(pack);
    await db.add_leaf(pack); //Remove leaves that are no longer leaves and add the new leaf
    const pre_state: { stabilizers: Map<string, bigint>, stabilization_chain: Array<Pack> } = {
        stabilizers,
        stabilization_chain: await get_stabilization_chain(pack)
    }
    if (pre_state.stabilizers.has(<string>pack.r_author)) {   //The pack was signed by a stabilizer, let's check if something became stable due to it
        if (pack.body[0].binary()[0] === TRANSITION_TYPES.MILESTONE) { //Milestones stabilize immediately since they already include the signature of every stabilizer
            for (const pack of pre_state.stabilization_chain)
                await make_stable(pack);
            if (pack.body.some(x=>x.binary()[0] === TRANSITION_TYPES.MILESTONE)) {
                const previous_milestone: string = await db.get_previous_milestone();
                //TODO stream-prune packs older than previous milestone
            }
        } else {
            let weights: Map<string, number> = await get_dag_weight(pack, structuredClone(pre_state.stabilizers));
            const required_weight: number = Math.ceil(pre_state.stabilizers.size / (2 - Number.EPSILON));
            for (let i = pre_state.stabilization_chain.length - 1; i >= 0; i--) {
                const pack: Pack = pre_state.stabilization_chain[i];
                if (<number>weights.get(<string>pack.r_hash) >= required_weight) { //This chain became stable
                    for (const pack of pre_state.stabilization_chain.slice(0, i + 1)) { //Stabilization must be run serially to prevent inconsistencies between nodes
                        await make_stable(pack);
                        if (pack.r_support)
                            weights = await get_dag_weight(pack, pre_state.stabilizers); //stabilizers have to be updated each iteration since they may change during the previous stabilization
                    }
                }
            }
        }
    }
}
/**
 * @description The main unit handling logic. This function takes a pack, checks that it is well-formed and adds it to the database
 * @description Validity of the pack is not checked until it stabilizes which means the pack may end up not executing
 * @param bin A binary-encoded pack
 * @param relay Whether to relay the pack to the network. We only relay packs created by our node.
 * @param processing_parent
 */
const wrapper = async (bin: Uint8Array, {processing_parent, relay}: {processing_parent?: boolean, relay?: boolean} = {processing_parent: false, relay: false}): RET_TYPE=>{
    const pack: Pack = Pack.from_binary(bin);
    if (await is_pack_known(<string>pack.r_hash))
        throw new Error("Duplicate pack");
    try {
        if (processing_parent)
            await handler(pack);
        else {
            db.batch();
            await mtx.runExclusive(handler.bind(null, pack));
            await db.write();
            if (process.env.RELAY) { //Store parenthoods
                const opt = await retry(() => Promise.all(pack.r_parents.map(x=>parenthoods.prepare('INSERT INTO Parenthoods (?, ?)').run(x, pack.r_hash))));
                if (!is_ok(opt))
                    return opt;
            }
        }
        relay && setImmediate(()=>broadcast_pack(pack));
        return {ok: <string>pack.r_hash};
    } catch (e) {
        console.trace((<Error>e).stack);
        db.rollback();
        return {err: (<Error>e).message};
    }
}
export default wrapper;