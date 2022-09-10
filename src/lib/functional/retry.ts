import {DB_MAX_SQL_RETRIES} from "#constants";

export default <T>(query: ()=>T): (Promise<Option<T>>)=>{
    const handler = async (retries: number = 0): Promise<Option<T>> => {
        if (retries > DB_MAX_SQL_RETRIES)
            try {
                const ok = await query();
                return {ok};
            } catch (e) {
                return await handler(retries + 1);
            }
        return {err: 'Too many retries'};
    }
    return handler();
}