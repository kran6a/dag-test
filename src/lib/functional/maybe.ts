type RET<T> = Promise<Option<T>>;
async function maybe<T>(fn: Promise<T> | Function): Promise<T>;
async function maybe<T, K>(fn: Promise<T>, fallback: K): Promise<T | K>;
async function maybe<T, K>(fn: Function, fallback: K): Promise<T | K>;
async function maybe <T, K>(fn: Promise<T> | Function, fallback: K, option?: boolean): RET<T | K>;
/**
 * @description Wraps an exception throwing function into a function that returns either the function result, a fallback value or an Option type
 * @param fn The function to wrap
 * @param fallback If provided, this value will be returned as an error if the function throws
 * @param option If true an Option type will be returned
 */
async function maybe <T, K>(fn: Promise<T> | Function, fallback: K, option?: boolean): RET<T | K>{
    try {
        if (typeof fn === "function")
            return fn();
        return await fn;
    } catch (e) {
        return option ? {err: (<Error>e).message} : fallback;
    }
}
export default maybe;