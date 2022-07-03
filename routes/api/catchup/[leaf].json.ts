import {is_string} from "#lib/validation";
import {db} from "#db";
import type Pack from "#classes/Pack";

/**
 * @description Returns the parents of the given pack. Useful for catchup purposes.
 * @description Smaller responses increase the cache hit rate and decrease the server response time while allowing the client to fetch data from multiple peers to prevent overloading a single node.
 * @param params
 * @param db testing only
 */
export const get = async ({params}: {params: {leaf: string}})=>{
    if (!is_string(params.leaf))
        return {status: 400, body: ''};
    const {ok, err}: Option<Pack> = await db.get_pack(params.leaf);
    if (err)
        return {status: 500, body: `We don't know pack ${params.leaf}`};
    const body: string = JSON.stringify(await Promise.all(ok.r_parents.map(async x=>await db.get_pack(x).then(pack=>pack.ok.json()))));
    return {status: 200, body, headers: {'content-type': 'application/json', 'content-length': body.length, 'cache-control': 'public,immutable'}};
}