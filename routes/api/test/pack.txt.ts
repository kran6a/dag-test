import handle_incoming_pack from "#lib/handle_incoming_pack";

export const put = async ({request}: {request: Request})=>{
    const {err, ok}: Option<string> = await handle_incoming_pack(await request.json(), {relay: true});
    return {status: err ? 400 : 200, headers: ok && {'content-type': "text/plain", 'content-length': ok.length}, body: err ? err : ok};
}