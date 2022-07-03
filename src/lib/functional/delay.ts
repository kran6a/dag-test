import {sleep} from "#lib/utils";

/**
 * @description Executes the passed HOF after the passed amount of milliseconds
 * @param fn The function to execute
 * @param time The time to sleep before executing the function in milliseconds
 * @return Whatever the HOF was returning initially
 */
export default async function <F extends ()=>any>(fn: F, time: number): Promise<ReturnType<F>>{
    await sleep(time)
    return fn();
}