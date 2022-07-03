import {db} from "#db";

/**
 * @description Returns the leaves known by the node
 */
export async function get(){
    const leaves: string[] = await db.get_leaves();
    return {status: 200, body: leaves, headers: {'content-type': 'application/json', 'content-length': JSON.stringify(leaves).length, 'cache-control': 'no-store'}};
}