import {db} from "#db";
import {ADDRESS_BYTE_LENGTH, PUBKEY_BYTE_LENGTH} from "#constants";

export const get = async ({params}: {params: {address: string}})=>{
    if (typeof params.address !== "string")
        return {status: 400, body: "Address must be a string", headers: {'cache-control': 'public,immutable', 'content-length': 24, 'content-type': 'text/plain'}};
    if (params.address.length !== ADDRESS_BYTE_LENGTH*2)
        return {status: 400, body: `Bad address length, expected ${ADDRESS_BYTE_LENGTH*2} characters`, headers: {'cache-control': 'public,immutable', 'content-length': 42, 'content-type': 'text/plain'}};

    const pubkey: string = await db.get_pubkey(params.address);
    if (!pubkey)
        return {status: 404, body: 'Account not found', headers: {'content-type': 'text/plain', 'content-length': 17, 'cache-control': 'no-store'}};
    return {status: 200, headers: {'content-type': 'text/plain', 'content-length': PUBKEY_BYTE_LENGTH*2, 'cache-control': 'public,immutable'}, body: pubkey};
}