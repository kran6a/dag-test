import {db} from "#db";

export const get = async ()=>{
    const body: Record<string, string> = Object.fromEntries([...(await db.get_stabilizers()).entries()].map(([key, value])=>[key, value.toString()]));
    return {status: 200, headers: {'content-type': 'application/json', 'content-length': body.length}, body};
}