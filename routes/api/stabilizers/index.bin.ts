import {db} from "#db";
import {bigint2word, string2buffer} from "#lib/serde";

export const get = async ()=>{
    const body: Uint8Array = new Uint8Array([...(await db.get_stabilizers()).entries()].map(([key, value])=>[string2buffer(key, 'hex'), bigint2word(value)]).flat().reduce((acc, cur)=>[...acc, ...cur], []));
    return {status: 200, headers: {'content-type': 'application/octet-stream', 'content-length': body.length}, body};
}