import {toJSON} from "#lib/serde";
import {db} from "#db";

export const get = async ({params}: {params: {hash: string}})=>{
    const {ok: token, err} = await db.get_token(params.hash);
    if (err)
        return {status: 404, body: ''};
    const body: string = toJSON(token);
    return {status: 200, headers: {"content-type": 'application/json', 'content-length': body.length, 'cache-control': 'public,max-age=300'}, body};
}