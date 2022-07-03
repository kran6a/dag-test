import {get as _get} from './[hash].json.js';
import {fromJSON, token2bin} from "#lib/serde";
//TODO stored tokens do not have a nonce
export const get = async ({params}: {params: {hash: string}})=>{
    const response = await _get({params});
    if (response.status !== 200)
        return response;
    const body = token2bin(fromJSON(response.body) as Omit<ParsedToken, "nonce">);
    return {status: 200, body, headers: response.headers};
}