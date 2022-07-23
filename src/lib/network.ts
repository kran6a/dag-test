import handle_incoming_pack from "#lib/handle_incoming_pack";
import {db} from "#db";
import Pack from '#classes/Pack';
import {buffer2string, string2buffer} from "#lib/serde";
import {create} from 'ipfs-http-client';
import {log} from "#lib/logger";
import {Agent} from "http";
import {is_ok} from "#lib/validation";
import {IPFS_HTTP_API_URL} from "#constants";

const NETWORK_ID: string = 'b519d1c6-937d-453d-81db-0bc3627e2287';
const PEER_TOPIC: string = 'f83ff43b-6167-40f1-ac9b-d0f946419d8e';

const ipfs = await create({url: IPFS_HTTP_API_URL, agent: new Agent({ keepAlive: true, maxSockets: Infinity })});
console.info("IPFS started");
await ipfs.pubsub.subscribe(`${NETWORK_ID}-pack`, async (msg)=>{
    log("Network", 'INFO', `We received a pack from the network with hash ${buffer2string(msg.data.slice(0, 32), 'base64url')}`);
    await handle_incoming_pack(msg.data, false);
});
await ipfs.pubsub.subscribe(`${NETWORK_ID}-query`, async (msg)=>{
    log("Network", 'INFO', `We got queried for ${buffer2string(msg.data.slice(0, 32), 'base64url')}`);
    const pack_hash: string = buffer2string(msg.data, 'base64url');
    const pack: Option<Pack> = await db.get_pack(pack_hash);
    return is_ok(pack) && ipfs.pubsub.publish(`${NETWORK_ID}-${pack_hash}`, pack.ok.binary());
});

//setInterval(async ()=>{
//await ipfs.swarm.connect("/ip4/132.226.222.29/tcp/4001/p2p/QmRyK1P8m5qw2FozGsiXZheTy63pFkftofixDFL2xHRxrq");
//    //console.log('Peers:', await ipfs.pubsub.peers(`${NETWORK_ID}-hello`), (await ipfs.swarm.peers()).map(x=>x.addr.nodeAddress().address));
//    await ipfs.pubsub.publish(`${NETWORK_ID}-hello`, string2buffer('hello from PC', 'utf8'));
//}, 10000);

/**
 * @description Queries the given pack from IPFS.
 * @param hash base64url-encoded pack hash
 */
export const query_pack = async (hash: string): Promise<Pack>=>{
    const response_topic: string = `${NETWORK_ID}-${hash}`;
    return new Promise(async (resolve)=>{
        await ipfs.pubsub.publish(`${NETWORK_ID}-query`, string2buffer(hash, 'base64url')); //Ask the network for the pack
        const interval = setInterval(async ()=>{
            await ipfs.pubsub.publish(`${NETWORK_ID}-query`, string2buffer(hash, 'base64url')); //Ask the network for the pack
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
    return Promise.all([ipfs.pubsub.publish(`${NETWORK_ID}-pack`, serialized), ipfs.pubsub.publish(`${NETWORK_ID}-${pack.r_hash}`, serialized)]);
}