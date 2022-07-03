import {get as _get} from "./milestone.txt.js";
import {string2buffer} from "#lib/serde";

export const get = async ()=>{
    const response = await _get();
    return {...response, headers: {...response.headers, 'content-length': 32}, body: string2buffer(response.body, 'base64url')};
}