import Pack from "#classes/Pack";
import {COMMUNITY_ADDRESS} from "#constants";
import {GENESIS_ACCOUNT_PRIVKEY} from "#secrets";

let last_stabilization: number = 0;

export const get = async ()=>{
    if (Date.now() - last_stabilization < 5*60*1000) //5min
        return {status: 400, body: "Last stabilization was made less than 5min ago. Wait a bit before retrying"}
    const {ok, err}: Option<string> = await (await new Pack().pay(COMMUNITY_ADDRESS, 'base', 1n).seal(GENESIS_ACCOUNT_PRIVKEY)).submit();
    return {status: err ? 400 : 200, headers: ok && {'content-type': "text/plain", 'content-length': ok.length}, body: err || ok};
}