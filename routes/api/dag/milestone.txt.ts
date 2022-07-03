import {db} from "#db";

export async function get(){
    const milestone: string = await db.get_milestone();
    return {status: 200, body: milestone, headers: {'content-type': 'text/plain', 'content-length': 43, 'cache-control': 'no-store'}};
}