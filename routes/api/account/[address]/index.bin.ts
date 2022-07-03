import {get as _get} from './index.json.js';
import {string2buffer} from "#lib/serde";
import {PUBKEY_BYTE_LENGTH} from "#constants";

export const get = async ({params}: {params: {address: string}})=>{
    const response = await _get({params});
    if (response.status !== 200)
        return response;
    return {...response, headers: {...response.headers, 'content-length': PUBKEY_BYTE_LENGTH}, body: string2buffer(response.body, 'hex')};
}