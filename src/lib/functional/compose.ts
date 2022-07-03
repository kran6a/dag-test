type MaybePromise<T> = Promise<T> | T;

function asyncPipe<A,                            B>(ab: (a: A) => MaybePromise<B>): (a: MaybePromise<A>) => Promise<B>
function asyncPipe<A, B,                         C>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>): (a: MaybePromise<A>) => Promise<C>
function asyncPipe<A, B, C,                      D>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>): (a: MaybePromise<A>) => Promise<D>
function asyncPipe<A, B, C, D,                   E>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>): (a: MaybePromise<A>) => Promise<E>
function asyncPipe<A, B, C, D, E,                F>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>): (a: MaybePromise<A>) => Promise<F>
function asyncPipe<A, B, C, D, E, F,             G>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>, fg: (f: F)=>MaybePromise<G>): (a: MaybePromise<A>) => Promise<G>
function asyncPipe<A, B, C, D, E, F, G,          H>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>, fg: (f: F)=>MaybePromise<G>, gh: (g: G)=>MaybePromise<H>): (a: MaybePromise<A>) => Promise<H>
function asyncPipe<A, B, C, D, E, F, G, H,       I>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>, fg: (f: F)=>MaybePromise<G>, gh: (g: G)=>MaybePromise<H>): (a: MaybePromise<A>, hi: (h: H)=>MaybePromise<I>) => Promise<I>
function asyncPipe<A, B, C, D, E, F, G, H, I,    J>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>, fg: (f: F)=>MaybePromise<G>, gh: (g: G)=>MaybePromise<H>): (a: MaybePromise<A>, hi: (h: H)=>MaybePromise<I>, ij: (i: I)=>MaybePromise<J>) => Promise<J>
function asyncPipe<A, B, C, D, E, F, G, H, I, J, K>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>, ef: (e: E)=>MaybePromise<F>, fg: (f: F)=>MaybePromise<G>, gh: (g: G)=>MaybePromise<H>): (a: MaybePromise<A>, hi: (h: H)=>MaybePromise<I>, ij: (i: I)=>MaybePromise<J>, jk: (j: J)=>MaybePromise<K>) => Promise<K>
//function asyncPipe<A, B, C, D, E>(ab: (a: A) => MaybePromise<B>, bc: (b: B) => MaybePromise<C>, cd: (c: C)=>MaybePromise<D>, de: (d: D)=>MaybePromise<E>) ##ADD ()=>MaybePromise<> here##: (a: MaybePromise<A>) => Promise<#change this to the last result#>
// extend to a reasonable amount of arguments

/**
 * @description Composes functions in a left to right order
 * @param fns Functions to compose
 */
function asyncPipe(...fns: Array<Function>) {
    return (x: any) => fns.reduce(async (y, fn) => fn(await y), x)
}
const compose: typeof asyncPipe = asyncPipe;
export default compose;