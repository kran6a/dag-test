import {reencode_string, toJSON} from "#lib/serde";
import {db} from "#db";
import memoize from "#lib/functional/memoize";
import type Pack from '#classes/Pack';
type DAG = Array<Pack | DAG>

//TODO add memoization
type RET = Promise<Map<string, number>>
/**
 * @description Returns the stabilizer weight of an unstable subgraph
 * @description The returned weight will always be lower than 51% of the sum of the stabilizer weights
 * @param pack The starting point
 * @param stabilizers A map object (address->weight). CAUTION: the object will be mutated
 * @param weights CAUTION: this parameter is only used during recursion and should never be passed
 * @param current_weight
 */
export const get_dag_weight = async (pack: Pack, stabilizers: Map<string, bigint>, weights: Map<string, number> = new Map(), current_weight: number = 0): RET=>{
    const is_stabilizer: boolean = stabilizers.has(<string>pack.r_author);
    if (is_stabilizer) {
        stabilizers.delete(<string>pack.r_author);                    //Count stabilizer only at the highest height
        weights.set(<string>pack.r_hash, ++current_weight);
    }
    else
        weights.set(<string>pack.r_hash, current_weight);
    const parents: Pack[] = <Pack[]>(await Promise.all(pack.r_parents.map(x=>db.get_pack(x)))).map(x=>x.ok).filter(x=>!x?.stable);
    if (parents.length > 0)
        await Promise.all(parents.map(x=>get_dag_weight(x, structuredClone(stabilizers), weights, current_weight)));
    return weights;
};

/**
 * @description Returns the stabilization chain sorted in reverse order (the most recently issued pack is the first)
 * @param pack The pack in which the chain starts
 * @param stabilizers
 */
const get_chain = memoize(async (pack: Pack, stabilizers: Map<string, bigint>, weights: Map<string, number>): Promise<DAG>=>{
    const options: Option<Pack>[] = (await Promise.all((pack.r_parents || []).map(x=>db.get_pack(x))));
    const parents: Pack[] = <Pack[]>options.map(x=>x.ok).filter(x=>x?.stable === false).sort((x, y)=><number>weights.get(<string>x!.r_hash) > <number>weights.get(<string>y!.r_hash) ? -1: 1);
    return [pack, await Promise.all((parents || []).map(x=>get_chain(x, stabilizers, weights)))];
}, {maxItems: 64, hasher: (pack: Pack, stabilizers: Map<string, bigint>): string=>pack.r_hash+'/'+toJSON([...stabilizers.values()])});

/**
 * @description Topologically sorts a DAG
 * @description Packs are sorted first by the came before order relationship then by weight and after that by their hash
 * @param dag
 * @param stabilizers
 * @param weights
 */
const topological_sort = async (dag: DAG, stabilizers: Map<string, bigint>, weights: Map<string, number>): Promise<Pack[]>=>{
    const visited: Set<string> = new Set<string>();
    const sorted: Pack[] = [];
    const visit = async (pack: Pack): Promise<void>=>{
        if (visited.has(<string>pack.r_hash))
            return;

        visited.add(<string>pack.r_hash);
        const parents: Pack[] = (<Pack[]>(await Promise.all(pack.r_parents?.map(x=>db.get_pack(x).then(x=>x.ok)) || []))).sort((x: Pack, y: Pack): 1 | -1=>{
            const [is_x_breadcrumb, is_y_breadcrumb]: [boolean, boolean] = <[boolean, boolean]>[x.r_author, y.r_author].map(x=>stabilizers.has(<string>x));
            if (is_x_breadcrumb && !is_y_breadcrumb) //Sort by breadcrumb
                return -1;
            else if (!is_x_breadcrumb && is_y_breadcrumb)//Sort by breadcrumb
                return 1;
            else if (is_x_breadcrumb && is_y_breadcrumb){ //Sort by support difference
                if (<bigint>stabilizers.get(<string>x.r_author) > <bigint>stabilizers.get(<string>y.r_author))
                    return -1;
                else if (<bigint>stabilizers.get(<string>x.r_author) < <bigint>stabilizers.get(<string>y.r_author))
                    return 1;
            }
            const [x_hash, y_hash]: [bigint, bigint] = <[bigint, bigint]>[x.r_hash, y.r_hash].map(x=>BigInt('0x'+reencode_string(<string>x, 'base64url', 'hex')));
            return x_hash >= y_hash ? 1 : -1;
        }).filter(x=>!x?.stable);
        for (const pack of parents)
            await visit(pack);
        if (!Array.isArray(pack)) {
            const stabilizers: Map<string, bigint> = await db.get_stabilizers();
            const weight: number = <number>weights.get(<string>pack.r_hash);
            weight >= Math.ceil(stabilizers.size/(2 - Number.EPSILON)) && sorted.push(pack);
        }
    }
    for (const pack of dag)
        await visit(<Pack>pack);
    return sorted;
}


/**
 * @description Returns an array of hashes generated from pack (we would only want to call this after a pack signed by a stabilizer is received since other packs do not cause stabilization)
 * @description The array is ordered from the oldest pack to the most recent one so that transitions can be applied by iterating the array from zero to n
 * @description This function does not check if the pack caused a stabilization. This must be checked AFTER execution
 * @param pack The pack that caused the stabilization
 * @return An array containing the packs that might become stable due to the provided pack hash
 */
export default async (pack: Pack): Promise<Pack[]>=>{
    const stabilizers: Map<string, bigint> = await db.get_stabilizers();
    const weights = await get_dag_weight(pack, stabilizers);
    return topological_sort(await get_chain(pack, stabilizers, weights), stabilizers, weights);
}