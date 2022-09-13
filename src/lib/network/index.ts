import Pack from "#classes/Pack";
import {buffer2string, string2buffer} from "#lib/serde";
import {log} from "#lib/logger";
import {RPC_SUBSCRIPTIONS} from "./trpc.js";
import {IPFS_NETWORK_ID} from "#constants";
import {ipfs} from './ipfs.js';

export * from './trpc.js';

/**
 * @description Queries the given pack from IPFS.
 * @param hash base64url-encoded pack hash
 */
export const query_pack = async (hash: string): Promise<Pack>=>{
    const response_topic: string = `${IPFS_NETWORK_ID}-${hash}`;
    return new Promise(async (resolve)=>{
        await ipfs.pubsub.publish(`${IPFS_NETWORK_ID}-query`, string2buffer(hash, 'base64url')); //Ask the network for the pack
        const interval = setInterval(async ()=>{
            await ipfs.pubsub.publish(`${IPFS_NETWORK_ID}-query`, string2buffer(hash, 'base64url')); //Ask the network for the pack
        }, 10000);
        await ipfs.pubsub.subscribe(response_topic, async (msg)=>{
            try{
                const pack: Pack = Pack.from_binary(msg.data);
                if (pack && pack.r_hash === hash){
                    await ipfs.pubsub.unsubscribe(response_topic);
                    clearInterval(interval);
                    resolve(pack);
                }
            } catch (e) {}
        });
    })
}

/**
 * @description Broadcasts a pack to the network
 * @param pack The Pack object
 */
export const broadcast_pack = (pack: Pack)=>{
    log("Network", 'INFO', `Broadcasting pack ${pack.r_hash}`);
    const serialized: Uint8Array = pack.binary();
    const string: string = buffer2string(serialized, 'binary');
    [...RPC_SUBSCRIPTIONS.values()].forEach(emit=>emit(string));
    return Promise.all([
        ipfs.pubsub.publish(`${IPFS_NETWORK_ID}-pack`, serialized),
        ipfs.pubsub.publish(`${IPFS_NETWORK_ID}-${pack.r_hash}`, serialized),
    ]);
}