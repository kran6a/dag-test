import secp256k1 from 'secp256k1';
import {db} from "#db";
import memoize from "#lib/functional/memoize";
import type Pack from "#classes/Pack";
import {string2buffer} from "#lib/serde";
import {createHash} from "crypto";
import Milestone from "#classes/Milestone";

type Ran<T extends number> = number extends T ? number :_Range<T, []>;
type _Range<T extends number, R extends unknown[]> = R['length'] extends T ? R[number] : _Range<T, [R['length'], ...R]>;
type Byte = Ran<255>

const HEX_REGEX: RegExp = /[\dA-Fa-f]/;
export const is_integer = (n: any): n is number=>typeof n === 'number' && Number.isInteger(n);
export const is_string = (str: any): str is string=>typeof str === "string";
export const is_bigint = (n: any): n is bigint=>typeof n === "string";
export const is_array = (arr: any): arr is any[]=>Array.isArray(arr);
export const is_empty_array = (arr: any): arr is any[] & {length: 0}=>is_array(arr) && arr.length === 0;
export const is_valid_byte = (n: any): n is Byte=>is_integer(n) && n >= 0 && n <= 255;
export const is_hex_string = (str: string): str is string=>is_string(str) && HEX_REGEX.test(str);
export const is_array_sorted_asc = (arr: any): arr is (number[] | bigint[])=>is_array(arr) && [...arr].sort((x, y)=> x < y ? -1 : 1).every((x, i)=>x === arr[i]);
export const is_valid_address = (address: any): address is string & {length: 64}=>is_string(address) && address.length === 64 && is_hex_string(address);
export const is_positive_bigint = (n: any): n is bigint=>is_bigint(n) && n >= 0n;
export const is_valid_pack_signature = (pack: Pack, pubkey: string): boolean=>{
    if (!is_string(pack.r_sig))
        return false;
    return secp256k1.ecdsaVerify(
        string2buffer(pack.r_sig, 'base64url'),
        createHash('sha256')
        .update(pack.binary(true))
        .digest(),
        string2buffer(pubkey, 'hex')
    );
}
/**
 * @description Checks whether every value in an array is unique
 * @param values
 */
export const are_values_unique = (values: any): values is any[]=>is_array(values) && new Set(values).size === values.length;
export const is_compact_array = <T>(values: T[]): values is NonUndefined<NonNullable<T>>[]=>is_array(values) && values.find((x): x is T=>(x === undefined || x === null)) === undefined;
export const is_err = <O, E>(arg: Option<O, E>): arg is {err: E, ok?: undefined}=>arg.ok === undefined && arg.err !== undefined;
export const is_ok = <O, E>(arg: Option<O, E>): arg is {ok: O, err?: undefined}=>!is_err(arg);
const are_parents_unique = (pack: Pack): boolean=>are_values_unique(pack.r_parents);
const are_parents_sorted = (pack: Pack): boolean=>{
    if (pack.r_parents.length === 1)
        return true;
    const numeric_hashes: bigint[] = pack.r_parents.map(x=>BigInt('0x' + Buffer.from(x, 'base64url').toString('hex')));
    return is_array_sorted_asc(numeric_hashes);
}
/**
 * @description Checks whether all parents are valid
 * @description The parent array is valid if it contains no duplicates, it does not include the pack hash as parent, parents are sorted, and all parents are 32 bytes
 * @param pack The pack
 */
export const are_parents_valid = (pack: Pack): boolean=>pack.r_parents.length > 0 && are_parents_unique(pack) && !pack.r_parents.includes(<string>pack.r_hash) && pack.r_parents.every(x=>Buffer.from(x, 'base64url').length === 32) && are_parents_sorted(pack);
export const is_pack_known = async (hash: string): Promise<boolean>=>{
    const option: Option<Pack> = await db.get_pack(hash);
    return !option.err;
}
export const are_all_parents_known = async (pack: Pack): Promise<boolean>=>Promise.all(pack.r_parents.map(x=>is_pack_known(x))).then(x=>x.every(x=>!!x));
export const is_milestone_pack = (pack: Pack): pack is Pack & {r_milestone_transition: Milestone}=>!!pack.r_milestone_transition;

/**
 * @description Check whether we know the public key of the given address
 * @param address Address
 */
export const is_account_known = async (address: string): Promise<boolean>=>!!await db.get_pubkey(address);
/**
 * @description Check whether we know the given smart contract
 * @param address Smart contract address
 */
export const is_smart_contract_known = async (address: string): Promise<boolean>=>!!await db.get_smart_contract(address);

/**
 * @description Check whether the given string is a valid base64url value
 * @param str The string
 */
export const is_valid_base64url = (str: any): str is string=>{
    if (!is_string(str))
        return false;
    try {
        return !!Buffer.from(str, 'base64url');
    } catch (e) {
        return false;
    }
};

/**
 * @description Executes a predicate against all parents
 * @description CAUTION: If the predicate does not break from recursion by having a base case it will result in an infinite loop
 * @param pack The starting pack
 * @param predicate The predicate. Return undefined to keep looping
 * @returns Whatever the predicate returns
 */
const some_parent = async <T>(pack: Pack, predicate: (pack: Pack)=>T): Promise<T>=>{
    const result: T = predicate(pack);
    if (result)
        return result;
    const parents: Option<Pack>[] = await Promise.all((pack?.r_parents || []).map(x=>db.get_pack(x)));
    return <T>(await Promise.all(parents.map((x: Option<Pack>)=>some_parent(<Pack>x.ok, predicate)))).find((x: T)=>x !== undefined);
}
/**
 * @description Checks if a pack is sequential. Being sequential means the author of the pack did not issue another pack on an unrelated DAG branch.
 * @param pack The pack
 */
//TODO topological sort
export const is_sequential = memoize(async (pack: Pack): Promise<boolean>=>{
    const milestone: string = <string>pack.r_milestone;
    const leaves: string[] = (await db.get_leaves()).filter(x=>x !== pack.r_hash && x !== milestone && !pack.r_parents.includes(x)); //Remove current pack and their leaves since any path from the leaves is already sequential
    const get_sequential_hash = (parent: Pack): string | undefined=>{
        if (parent.r_hash === pack.r_hash && pack.r_hash !== milestone)
            return;
        if (parent.r_author === pack.r_author)  //We reached a previous pack by the same author
            return parent.r_hash;
        if (parent.r_hash === milestone)      //We reached the milestone
            return milestone;
    };
    const expected: string | undefined = leaves.length === 0 ? milestone : await some_parent(pack, get_sequential_hash); //Expected parent according to the pack author
    const actual: Awaited<string | undefined>[] = leaves.length === 0 ? [milestone] : await Promise.all(leaves.map(async x=>some_parent(<Pack>await db.get_pack(x).then(x=>x.ok), get_sequential_hash))); //Parents we got following paths from leaves
    //TODO may need to re-enable logging here
    //console.log({expected}, {actual}, pack.hash, {leaves});
    return actual.every(x=>x === expected); //Every path converges
}, {maxItems: 128, hasher: (pack: Pack): string=><string>pack.r_hash});