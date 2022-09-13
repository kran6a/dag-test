import {create} from "ipfs-http-client";
import {IPFS_HTTP_API_URL, IPFS_NETWORK_ID} from "#constants";
import {Agent} from "http";
import {log} from "#lib/logger";
import {buffer2string} from "#lib/serde";
import handle_incoming_pack from "#lib/handle_incoming_pack";
import Pack from "#classes/Pack";
import {db} from "#db";
import {is_ok} from "#lib/validation";

export const ipfs = await create({url: IPFS_HTTP_API_URL, agent: new Agent({ keepAlive: true, maxSockets: Infinity })});
console.info("IPFS started");

await ipfs.pubsub.subscribe(`${IPFS_NETWORK_ID}-pack`, async (msg)=>{
    log("Network:IPFS", 'INFO', `We received a pack from the network with hash ${buffer2string(msg.data.slice(0, 32), 'base64url')}`);
    await handle_incoming_pack(msg.data);
});
await ipfs.pubsub.subscribe(`${IPFS_NETWORK_ID}-query`, async (msg)=>{
    log("Network:IPFS", 'INFO', `We got queried for ${buffer2string(msg.data.slice(0, 32), 'base64url')}`);
    const pack_hash: string = buffer2string(msg.data, 'base64url');
    const pack: Option<Pack> = await db.get_pack(pack_hash);
    return is_ok(pack) && ipfs.pubsub.publish(`${IPFS_NETWORK_ID}-${pack_hash}`, pack.ok.binary());
});

//setInterval(async ()=>{
//await ipfs.swarm.connect("/ip4/132.226.222.29/tcp/4001/p2p/QmRyK1P8m5qw2FozGsiXZheTy63pFkftofixDFL2xHRxrq");
//    //console.log('Peers:', await ipfs.pubsub.peers(`${NETWORK_ID}-hello`), (await ipfs.swarm.peers()).map(x=>x.addr.nodeAddress().address));
//    await ipfs.pubsub.publish(`${NETWORK_ID}-hello`, string2buffer('hello from PC', 'utf8'));
//}, 10000);