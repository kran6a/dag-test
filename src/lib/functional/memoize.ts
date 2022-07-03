type Function<I extends any[], O> = (...args: I)=>O;

type Hasher = <K extends number | string | symbol, Fun extends Function<Parameters<Fun>, K>>(...x: Parameters<Fun>)=>K;

const defaults: {hasher: Hasher} = {hasher: <K extends number | string | symbol, Fun extends Function<Parameters<Fun>, K>>(...x: Parameters<Fun>)=>JSON.stringify(x) as K} as const;

const memoize = <T extends Function<any[], any>, K extends number | string | symbol>(fn: T, opts?: {argc?: number, maxItems?: number, hasher?: (...args: [...Parameters<T>])=>K, maxage?: number}): T => {
    const {argc, maxItems, hasher, maxage} = {...defaults, ...opts};
    const cache: Map<K, ReturnType<T>> = new Map<K, ReturnType<T>>();
    const expirations: Array<number> = [];
    return ((...args: Parameters<T>): ReturnType<T> => {
        // @ts-ignore
        const key: K = args && hasher(...(argc ? args.slice(0, argc) : args) as Parameters<T>);
        const now: number | undefined = maxage && Date.now();
        let i: number = 0;
        while (now && expirations[i] && expirations[i] < now){//Evict expired
            const next = cache.keys().next();
            cache.delete(next.value);
            i++;
        }
        if (cache.has(key))
            return <ReturnType<T>>cache.get(key);
        const result: ReturnType<T> = fn(...args);
        cache.set(key, result);
        if (now)
            expirations.push(now);
        if (maxItems && cache.size > maxItems) {
            cache.delete(cache.keys().next().value);//Delete first inserted key
            if (maxage)
                expirations.shift(); //Delete its associated expiration
        }
        return result;
    }) as T;
};
export default memoize;