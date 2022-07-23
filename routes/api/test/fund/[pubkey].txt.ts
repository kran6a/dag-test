import Pack from "#classes/Pack";
import {BASE_TOKEN, PUBKEY_BYTE_LENGTH} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";
import {createHash} from "crypto";

let last_stabilization: number = 0;

export const get = async ({params}: {params: {pubkey: string}})=>{
    if (Date.now() - last_stabilization < 5*60*1000) //5min
        return {status: 400, body: "Last stabilization was made less than 5min ago. Wait a bit before retrying"};
    if (params.pubkey.length !== PUBKEY_BYTE_LENGTH*2)
        return {status: 400, body: "Malformed pubkey"};
    const address: string = createHash('sha256').update(params.pubkey, 'hex').digest('hex');
    const {ok, err}: Option<string> = await (await new Pack().account(params.pubkey).pay(address, BASE_TOKEN, 50000n).seal(GENESIS_ACCOUNT_PRIVKEY)).submit();
    return {status: err ? 400 : 200, headers: ok && {'content-type': "text/plain", 'content-length': ok.length.toString()}, body: err || ok};
}