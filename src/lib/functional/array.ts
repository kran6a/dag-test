export const async_filter = async <T, I, O>(arr: T[], predicate: (value: T, i: number, array: T[])=>O): Promise<T[]> => {
    const results: O[] = await Promise.all(arr.map(predicate));
    return arr.filter((_v, index) => results[index]);
}