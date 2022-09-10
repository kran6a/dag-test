import {DB_MAX_SQL_RETRIES} from "#constants";

export default <T>(query: ()=>T): (Promise<Option<T>>)=>{
    const handler = async (retries: number = 0): Promise<Option<T>> => {
        try {
            const ok = await query();
            return {ok};
        } catch (e) {
            console.error("Retrying", e);
            if (retries > DB_MAX_SQL_RETRIES)
                return {err: 'Too many retries'};
            return await handler(retries + 1);
        }
    }
    return handler();
}