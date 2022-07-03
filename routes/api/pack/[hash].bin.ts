import {db} from "#db";
import type Pack from "#classes/Pack";

export const get = async ({params}: {params: {hash: string}})=>{
    if (typeof params.hash !== 'string')
        return {status: 400, headers: {'cache-control': 'public,immutable', 'content-type': "text/plain", 'content-length': 21}, body: 'Hash must be a string'};
    if (params.hash.length !== 43)
        return {status: 400, headers: {'cache-control': 'public,immutable', 'content-type': "text/plain", 'content-length': 28}, body: 'Bad hash length, expected 43'};
    const {ok: pack, err}: Option<Pack> = await db.get_pack(params.hash);
    if (err)
        return {status: 404, headers: {'cache-control': 'public,max-age=60', 'content-type': "text/plain", 'content-length': 14}, body: 'Pack not found'};
    const body: Uint8Array = pack.binary();
    return {status: 200, headers: {'cache-control': 'public,immutable', 'content-type':'application/octet-stream', 'content-length': body.length}, body};
}

/**
 * @description Check whether the node knows a pack
 * @param {object} params
 * @param {string} params.hash The hash of the unit
 * @return 200: The pack is known, 404: Pack not found
 */
export const head = async ({params}: {params: {hash: string}})=>{
    const result = await get({params});
    return {status: result.status, headers: {'cache-control': result.status === 200 ? 'public,immutable' : 'public,max-age=60'}};
}