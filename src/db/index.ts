import level from 'level-rocksdb';
import {createHash} from "crypto";
import {rmSync, statSync} from "fs";
import {BALANCE_WIDTH_BITS, BASE_TOKEN, BALANCE_WIDTH_BYTES, BINARY_ZERO, BINARY_ZERO_STRING, GENESIS_ACCOUNT_ADDRESS, GENESIS_ACCOUNT_PUBKEY, GENESIS_BALANCE, MAX_CAP, GENESIS_UNIT_HASH, DB_PARENTHOOD_QUERY_TIMEOUT} from "#constants";
import Database from 'better-sqlite3';
import {bigint2word, bin2token, binary2bigint, buffer2string, fromJSON, reencode_string, string2buffer, toBigInt, toJSON} from "#lib/serde";
import Pack from "#classes/Pack";
import Token from "#classes/Token";
import Account from "#classes/Account";
import Issue from "#classes/Issue";
import {sleep} from "#lib/utils";
import {log} from "#lib/logger";
import type {Hash} from "crypto";
import type {Database as Sqlite} from 'better-sqlite3';

const _db: RocksDB = level(process.env.DB_NAME || './rocks.db');
const _sql: Sqlite | undefined = process.env.RELAY ? new Database(process.env.PARENTHOOD_DB_NAME || './sqlite.db', {timeout: DB_PARENTHOOD_QUERY_TIMEOUT}) : undefined

/**
 * @description Returns the hash of the current DB state. This hash is embedded in milestones so that all nodes can verify that their state is in sync with stabilizers.
 */
export const get_state_hash = (): Promise<string>=>{
    const hash: Hash = createHash('sha256');
    return new Promise((resolve, reject)=>{
        _db.createReadStream()
        .on('data', ({key, value}: {key: string, value: string})=>{
            if (key.length === 33 && key.at(0) === 'p') //Is stable pack
                hash.update(key, 'binary').update('_').update(value, 'binary').update(';');
        })
        .on('error', (err: Error)=>reject(err))
        .on('end', (): void=>resolve(hash.digest('hex')))
    });
}

const compute_smart_contract_address = (code: Uint8Array, encoding: 'hex' | 'binary'): string=>createHash('sha256').update('sca_', 'utf8').update(code).digest(encoding);

export class DB {
    private cache: Map<string, string> = new Map<string, string>();
    private del_set: Set<string> = new Set<string>();
    private put_set: Set<string> = new Set<string>();
    private readonly db: RocksDB;
    private transaction: boolean = false;
    private parenthoods?: Sqlite;

    constructor(db: RocksDB, parenthoods?: Sqlite) {
        this.db = db;
        this.parenthoods = parenthoods;
    }
    put(key: string, value: string): DB | Promise<void>{
        if (!this.transaction)
            return this.db.put(key, value);
        this.del_set.delete(key);
        this.put_set.add(key);
        this.cache.set(key, value);
        return this;
    }
    get_children_iterator(pack: string): IterableIterator<{New: string}> {
        if (!this.parenthoods)
            throw new Error("Your node is not a relay");
        return this.parenthoods.prepare('SELECT New FROM Parenthoods WHERE Old = (?)').iterate(pack);
    }
    async get(key: string): Promise<string>{ //Does not check for transaction
        if (this.cache.has(key))
            return <Promise<string>><unknown>this.cache.get(key);
        try{
            return await this.db.get(key);
        } catch (e){
            return '';
        }
    }
    del(key: string){
        if (this.transaction) {
            this.del_set.add(key);
            this.put_set.delete(key);
            this.cache.set(key, '');
        }
    }
    batch(){
        if (this.transaction)
            throw new Error("Already in a transaction");
        this.rollback();
        this.transaction = true;
    }
    rollback(): void{
        //Clear all caches
        this.del_set.clear();
        this.put_set.clear();
        this.cache.clear();
        this.transaction = false;
    }
    write(): Promise<void>{
        const ops: ({type: 'del', key: string} | {type: 'put', key: string, value: string})[] = <{type: 'del', key: string}[]>([...this.del_set.values()].map(x=>({type: 'del', key: x}))).concat([...this.put_set.values()].map(x=>({type: 'put', key: x, value: this.cache.get(x)})));
        log('DB', 'INFO', `Updating state ${JSON.stringify(ops, null, 2)}`);
        return new Promise((resolve, reject)=>{
            _db.batch(ops, (err)=>{
                if (err)
                    reject(err);
                this.rollback();
                resolve();
            });
        });
    }
    async get_token(hash: string): Promise<Option<{ hash: string, cap: bigint, burnable: boolean, issuers: string[], supply: bigint }>> {
        const final_hash: string = hash === BASE_TOKEN ? createHash('sha256').update('token_', 'utf8').update(hash, 'base64url').digest('binary') : reencode_string(hash, 'base64url', "binary");
        let raw: string | undefined;
        try {
            raw = await this.get(final_hash);
        } catch (e) {
            raw = undefined;
        }
        if (!raw)
            return {err: "Token not found"};
        const parsed: ParsedToken = bin2token(string2buffer(raw, 'binary'));
        return {ok: {...parsed, hash, cap: parsed.cap ? parsed.cap : MAX_CAP, burnable: parsed.burnable || false, supply: await this.get_supply(hash)}};
    }
    async get_balance(address: string, token: string): Promise<bigint> {
        const key: string = createHash('sha256').update('balance_', 'utf8').update(address, 'hex').update('_', 'utf8').update(token, 'base64url').digest('binary');
        const binary_balance: string = await this.get(key);
        if (binary_balance.length === 0)
            return 0n;
        return toBigInt('0x' + reencode_string(binary_balance, 'binary', 'hex'));
    }
    set_balance(address: string, token: string, amount: bigint): void{
        const key: string = createHash('sha256').update('balance_', 'utf8').update(address, 'hex').update('_', 'utf8').update(token, 'base64url').digest('binary');
        const binary_balance: Uint8Array = string2buffer(amount.toString(16).padStart(BALANCE_WIDTH_BITS * 2, '0'), 'hex');
        if (amount === 0n)
            this.del(key);
        this.put(key, buffer2string(binary_balance, 'binary'));
    }
    async get_supply(token: string): Promise<bigint> {
        const supply_key: Uint8Array = new Uint8Array(createHash('sha256').update('supply_', 'utf8').update(token, 'base64url').digest());
        const binary_supply: Uint8Array = string2buffer(await this.get(buffer2string(supply_key, 'binary')), 'utf8');
        return binary2bigint(binary_supply.length === 0 ? BINARY_ZERO : binary_supply);
    }
    set_supply(token: string, amount: bigint): void{
        this.put(createHash('sha256').update('supply_', 'utf8').update(token,'base64url').digest('binary'), buffer2string(bigint2word(amount, BALANCE_WIDTH_BYTES), 'binary'));
    }
    get_channel(owner: string, key: string): Promise<string>{
            return this.get(createHash('sha256').update('channel_', 'utf8').update(owner, 'hex').update(key, 'utf8').digest('binary'))
    }
    get_channel_raw(hash: string): Promise<string>{
        return this.get(hash);
    }
    set_channel(owner: string, key: string, value: string){
        this.put(createHash('sha256').update('channel_', 'utf8').update(owner, 'hex').update(key, 'utf8').digest('binary'), value)
    }
    async get_pubkey(address: string): Promise<string> {
        return reencode_string(await this.get(reencode_string(address, 'hex', 'binary')), 'binary', 'hex');
    }
    set_pubkey(pubkey: string): void{
        const bin_address: string = createHash('sha256').update(pubkey, 'hex').digest('binary');
        const bin_pubkey: string = reencode_string(pubkey, 'hex', 'binary');
        this.put(bin_address, bin_pubkey);
    }
    async get_smart_contract(address: string): Promise<Uint8Array> {
        let result: string | undefined;
        try {
            result = await this.get(reencode_string(address, 'hex', 'binary'))
        } catch (e) {
            result = undefined;
        }
        if (!result)
            return BINARY_ZERO;
        return string2buffer(result, 'binary');
    }
    set_smart_contract(code: Uint8Array): void{
        this.put(compute_smart_contract_address(code, 'binary'), buffer2string(code, 'binary'));
    }
    async get_staked_by_to(supporter: string, supportee: string): Promise<bigint> {
        const key: string = createHash('sha256').update('support_', 'utf8').update(supporter, 'hex').update('_', 'utf8').update(supportee, 'hex').digest('binary');
        let raw: string;
        try {
            raw = await this.get(key);
        } catch (e) {
            raw = BINARY_ZERO_STRING;
        }
        if (raw.length === 0)
            return 0n;
        return binary2bigint(Buffer.from(raw, 'binary'));
    }
    async get_support(address: string): Promise<bigint> {
        const key: string = createHash('sha256').update('supportee_', 'utf8').update(address, 'hex').digest('binary');
        let raw: string;
        try{
            raw = await this.get(key)
        } catch{
           raw = BINARY_ZERO_STRING;
        }
        if (raw.length === 0)
            return 0n;
        return binary2bigint(Buffer.from(raw, 'binary'));
    }
    set_staked_to(supporter: string, supportee: string, amount: bigint): void {
        const key: string = createHash('sha256').update('support_', 'utf8').update(supporter, 'hex').update('_', 'utf8').update(supportee, 'hex').digest('binary');
        this.put(key, Buffer.from(amount.toString(16).padStart(BALANCE_WIDTH_BITS * 2, '0'), 'hex').toString("binary"));
    }
    set_support(stabilizer: string, amount: bigint): void {
        const key: string = createHash('sha256').update('supportee_', 'utf8').update(stabilizer, 'hex').digest('binary');
        this.put(key, Buffer.from(amount.toString(16).padStart(BALANCE_WIDTH_BITS * 2, '0'), 'hex').toString("binary"));
    }
    private static genesis_pack(){
        const ret: Pack = new Pack()
        .token({cap: GENESIS_BALANCE, burnable: false, nonce: 0x00, issuers: [GENESIS_ACCOUNT_ADDRESS]})
        .issue(GENESIS_ACCOUNT_ADDRESS, BASE_TOKEN, GENESIS_BALANCE)
        ret.stable = true;
        ret.r_parents = [];
        ret.r_hash = BASE_TOKEN;
        ret.r_sig = '';
        ret.r_milestone = BASE_TOKEN;
        ret.r_author = GENESIS_ACCOUNT_ADDRESS;
        return ret;
    }
    async get_pack(hash: string): Promise<Option<Pack & {stable: boolean}>> {
        if (hash === BASE_TOKEN)
            return {ok: <Pack & {stable: boolean}>DB.genesis_pack()};
        const reencoded: string = reencode_string(hash, 'base64url', 'binary');
        const raw_permanent_pack: string = await this.get('p'+reencoded);
        const raw_temporal_pack: false | string = raw_permanent_pack.length === 0 && await this.get('t'+reencoded);
        const binary: Uint8Array = string2buffer(<string>(raw_permanent_pack || raw_temporal_pack), 'binary');
        if (binary.length === 0)
            return {err: "Pack not found"};
        const ret: Pack = new Pack(binary);
        ret.stable = raw_permanent_pack.length > 0;
        return {ok: <Pack & {stable: boolean}>ret};
    }
    set_pack(pack: Pack){
        const key: string = reencode_string("t", 'utf8', 'binary')+reencode_string(<string>pack.r_hash, 'base64url', 'binary');
        this.put(key, buffer2string(pack.binary(), 'binary'));
    }
    set_stable(pack: Pack){
        const reencoded: string = reencode_string(<string>pack.r_hash, 'base64url', 'binary');
        const old_key: string = reencode_string("t", 'utf8', 'binary')+reencoded;
        const new_key: string = reencode_string("p", 'utf8', 'binary')+reencoded;
        this.del(old_key);
        this.put(new_key, buffer2string(pack.binary(), 'binary'));
    }
    async get_leaves(): Promise<string[]> {
        return JSON.parse(await this.get('leaves'));
    }
    get_milestone(){
        return this.get('milestone');
    }
    get_previous_milestone(){
        return this.get('previous_milestone')
    }
    async get_stabilizers(): Promise<Map<string, bigint>> {
        const stabilizers: {address: string, support: bigint}[] = <{address: string, support: bigint}[]>fromJSON(await this.get('stabilizers'));
        return stabilizers.reduce((acc, cur)=>acc.set(cur.address, cur.support), new Map());
    }
    set_stabilizers(stabilizers: {address: string, support: bigint}[]): void{
        this.put('stabilizers', toJSON(stabilizers));
    }
    async add_leaf(pack: Pack){
        const old_leaves: string[] = await this.get_leaves();
        this.put('leaves', JSON.stringify(old_leaves.filter(x=>!pack.r_parents.some(y=>y===x)).concat(<string>pack.r_hash)));
    }
    /**
     * Initializes the database
     * @param stabilizers pubkeys and support of the initial stabilizers
     * @param max_stabilizers pad the stabilizer array to allow for more stabilizers in the future
     */
    async initialize({stabilizers = {[GENESIS_ACCOUNT_PUBKEY]: GENESIS_BALANCE/10n}, balances = {[GENESIS_ACCOUNT_ADDRESS]: 500000n}}: {stabilizers: Record<string, bigint>, balances?: Record<string, bigint>} = {stabilizers: {[GENESIS_ACCOUNT_PUBKEY]: GENESIS_BALANCE/10n}, balances: {[GENESIS_ACCOUNT_ADDRESS]: 500000n}}) {
        log('DB', "INFO", 'Initializing DB');
        await nuke();
        this.batch();
        const genesis_pack = DB.genesis_pack();
        this.put('leaves', JSON.stringify([genesis_pack.r_hash]));
        const stabilizer_arr: {address: string, support: bigint}[] = Object.entries(stabilizers).map(([pubkey, support])=>({address: createHash('sha256').update(pubkey, 'hex').digest('hex'), support}));
        this.set_stabilizers(stabilizer_arr);
        new Account(Object.keys(stabilizers)).apply();
        new Token([{cap: GENESIS_BALANCE, issuers: [GENESIS_ACCOUNT_ADDRESS], burnable: false, nonce: 0x00}]).apply(<Pack>{r_hash: GENESIS_UNIT_HASH});
        await new Issue({[BASE_TOKEN]: balances}).apply(genesis_pack);
        this.put('milestone', <string>genesis_pack.r_hash);
        stabilizer_arr.map(({address, support})=>{
            db.set_staked_to(address, address, support);//Update supporter amount
            db.set_support(address, support);    //Update supportee amount
        });
        await this.write();
        log('DB', "INFO", 'Initialized main db');
        if (process.env.RELAY){
            const db_size = statSync(parenthoods_db_path).size;
            if (!db_size){
                log('DB', "INFO", 'Initializing parenthood DB');
                await (<Sqlite>this.parenthoods).exec('CREATE TABLE `Parenthoods` (`Previous` CHAR(32) NOT NULL, `Next` CHAR(32) NOT NULL, PRIMARY KEY (`Previous`, `Next`))');
                log('DB', "INFO", 'Initialized parenthood db');
            }
        }
    }
    async close(): Promise<void>{
        await this.db.close();
    }
}
const exp: DB = new DB(_db, _sql);
export const db = exp;
try {
    await _db.get("milestone");
    await sleep(4200);
    await exp.initialize();
    process.exit(0);
} catch (e) {}

process.on('SIGINT', async ()=>{
    await db.close();
    process.exit();
});

export const nuke = async (): Promise<void>=>{
    await db.close();
    await _sql?.exec('DELETE FROM `Parenthoods`');
    try {
        rmSync(process.env.DB_NAME || './rocks.db', {recursive: true});
    } catch (e){

    }
    await _db.open();
}