import {db} from "#db";
import {ADDRESS_BYTE_LENGTH, BASE_TOKEN} from "#constants";

export const get = async ({params}: {params: {address: string, token: string}})=>{
    if (typeof params.address !== "string")
        return {status: 400, headers: {'content-type': 'text-plain', 'content-length': 24, 'cache-control': 'public,immutable'}, body: 'Address must be a string'};
    if (typeof params.token !== "string")
        return {status: 400, headers: {'content-type': 'text-plain', 'content-length': 22, 'cache-control': 'public,immutable'}, body: 'Token must be a string'};
    if (params.address.length !== ADDRESS_BYTE_LENGTH*2)
        return {status: 400, headers: {'content-type': 'text-plain', 'content-length': 31, 'cache-control': 'public,immutable'}, body: `Bad address length, expected ${ADDRESS_BYTE_LENGTH*2}`};
    if (params.token.length !== 43)
        return {status: 400, headers: {'content-type': 'text-plain', 'content-length': 29, 'cache-control': 'public,immutable'}, body: `Bad token length, expected ${ADDRESS_BYTE_LENGTH*2}`};

    const body: string = (await db.get_balance(params.address, params.token === 'base' ? BASE_TOKEN : params.token)).toString();
    return {status: 200, body, headers: {'content-type': 'text/plain', 'content-length': body.length, 'cache-control': 'no-store'}};
}