import {get as _get} from './[name].txt.js';
import {string2buffer} from "#lib/serde";

export async function get({params}: {params: {address: string, name: string}}) {
    const response = await _get({params});
    if (response.status !== 200)
        return response;
    const body: Uint8Array = string2buffer(response.body, 'binary');
    return {...response, headers: {...response.headers, 'content-type': 'application/octet-stream', 'content-length': body.length}, body};
}