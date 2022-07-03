import {db} from "#db";
import {ADDRESS_BYTE_LENGTH} from "#constants";

export async function get({params}: {params: {address: string | undefined, name: string | undefined}}){
    if (typeof params.address !== "string")
        return {status: 400, headers: {'content-type': 'text/plain', 'content-length': 24, 'cache-control': 'public,immutable'}, body: 'Address must be a string'};
    if (typeof params.name !== "string")
        return {status: 400, headers: {'content-type': 'text/plain', 'content-length': 21, 'cache-control': 'public,immutable'}, body: 'Name must be a string'};
    if (params.address.length !== ADDRESS_BYTE_LENGTH*2)
        return {status: 400, headers: {'content-type': 'text/plain', 'content-length': 31, 'cache-control': 'public,immutable'}, body: `Bad address length, expected ${ADDRESS_BYTE_LENGTH*2}`};

    const body: string = await db.get_channel(params.address, params.name);
    return {status: 200, headers: {'content-type': 'text/plain', 'content-length': body.length, 'cache-control':'no-store'}, body};
}