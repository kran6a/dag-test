import {db} from "#db";
import {string2buffer} from "#lib/serde";

/**
 * @description Returns the leaves known by the node
 */
export async function get(){
    const leaves: string[] = await db.get_leaves();
    return {status: 200, body: new Uint8Array(leaves.map(x=>string2buffer(x, 'base64url')).reduce((acc, cur)=>{acc.push(...cur); return acc}, [])), headers: {'content-type': 'application/json', 'content-length': JSON.stringify(leaves).length, 'cache-control': 'no-store'}};
}