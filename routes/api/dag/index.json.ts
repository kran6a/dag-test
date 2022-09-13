import {db} from "#db";
import {toJSON} from "#lib/serde";
import type Pack from "#classes/Pack";

/**
 * @description Returns the full DAG
 * @description This method is not supposed to be public as it will use a lot of server time
 */
export async function get(){
    const leaves: string[] = <string[]>JSON.parse(await db.get('leaves'));
    const packs: Pack[] = [];
    const already_added: Set<string> = new Set<string>();
    const add_pack = async (pack: Pack)=>{
        if (!already_added.has(<string>pack.r_hash)) {
            already_added.add(<string>pack.r_hash);
            packs.push(pack);
        }
        await Promise.all(pack?.r_parents?.map(async x=>add_pack(await db.get_pack(x).then(x=>x.ok))) || []);
    }
    await Promise.all((await Promise.all(leaves.map(x=>db.get_pack(x)))).map(x=>add_pack(x.ok)));
    const body: string = toJSON(packs.map(x=>x.json()));
    return {status: 200, headers: {'content-type': "application/json",'content-length': body.length}, body};
}