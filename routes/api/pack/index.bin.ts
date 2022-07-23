import handle_incoming_pack from "#lib/handle_incoming_pack";
import Pack from "#classes/Pack";
import {PRIVATE_KEY} from "#secrets";

//Sign and broadcast
export const put: Endpoint = async ({request})=>{
    const raw: Uint8Array = new Uint8Array(request.body);
    const pack: Pack = await Pack.from_binary(raw).seal(PRIVATE_KEY);
    const {ok, err}: Option<string> = await handle_incoming_pack(pack.binary(), true); //This pack was authored by this node. We must relay it to the network
    return {status: err ? 400 : 200, headers: ok ? {'content-type': "text/plain", 'content-length': ok.length} : {"content-length": <number>err?.length, "content-type": 'text/plain'}, body: err ? err : ok};
}

//Someone relayed us a pack
export const post: Endpoint = async ({request, url})=>{
    const raw: Uint8Array = new Uint8Array(request.body);
    const {ok, err}: Option<string> = await handle_incoming_pack(raw, url.searchParams.has('relay')); //Do not relay this, we assume the author already relayed it. Otherwise, it will be queried when someone references it as a parent.
    if (err)
        return {status: 400, headers: {'content-type': "text/plain", 'content-length': err.length}, body: err};
    return {status: 200, headers: {'content-length': (<string>ok).length, 'content-type': 'text/plain'}, body: ok};
}