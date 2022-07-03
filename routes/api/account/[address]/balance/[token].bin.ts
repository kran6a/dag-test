import {get as _get} from './[token].txt.js';
import {bigint2word} from "#lib/serde";
import {BALANCE_WIDTH_BYTES} from "#constants";

export const get = async ({params}: {params: {address: string, token: string}})=>{
    const response = await _get({params});
    if (response.status !== 200)
        return response;
    return {...response, headers: {...response.headers, 'content-type': 'application/octet-stream', 'content-length': BALANCE_WIDTH_BYTES}, body: bigint2word(BigInt(response.body))};
}