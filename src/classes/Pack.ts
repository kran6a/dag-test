import Payment from "#classes/Payment";
import Support from "#classes/Support";
import Milestone from "#classes/Milestone";
import Issue from "#classes/Issue";
import Execution from "#classes/Execution";
import Token from "#classes/Token";
import Dapp from "#classes/DAPP";
import Channel from "#classes/Channel";
import Account from "#classes/Account";
import Burn from "#classes/Burn";
import secp256k1 from "secp256k1";
import {buffer2string, reencode_string, string2buffer, toBigInt} from "#lib/serde";
import {ADDRESS_BYTE_LENGTH, BASE_TOKEN, DEFAULT_TOKEN_NONCE, SIGNATURE_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import {createHash} from "crypto";
import {db} from "#db";
import {are_all_parents_known, is_account_known, is_compact_array, is_string} from "#lib/validation";
import handle_incoming_pack from "#lib/handle_incoming_pack";

const possible_nonces = [
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,

    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,

    20,
    21,
    22,
    23,
    24,
    25,
    26,
    27,
    28,
    29,

    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,

    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,

    50,
    51,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,

    60,
    61,
    62,
    63,
    64,
    65,
    66,
    67,
    68,
    69,

    70,
    71,
    72,
    73,
    74,
    75,
    76,
    77,
    78,
    79,

    80,
    81,
    82,
    83,
    84,
    85,
    86,
    87,
    88,
    89,

    90,
    91,
    92,
    93,
    94,
    95,
    96,
    97,
    98,
    99,

    100,
    101,
    102,
    103,
    104,
    105,
    106,
    107,
    108,
    109,
    110,

    111,
    112,
    113,
    114,
    115,
    116,
    117,
    118,
    119,

    120,
    121,
    122,
    123,
    124,
    125,
    126,
    127,
    128,
    129,

    130,
    131,
    132,
    133,
    134,
    135,
    136,
    137,
    138,
    139,

    140,
    141,
    142,
    143,
    144,
    145,
    146,
    147,
    148,
    149,

    150,
    151,
    152,
    153,
    154,
    155,
    156,
    157,
    158,
    159,

    160,
    161,
    162,
    163,
    164,
    165,
    166,
    167,
    168,
    169,

    170,
    171,
    172,
    173,
    174,
    175,
    176,
    177,
    178,
    179,

    180,
    181,
    182,
    183,
    184,
    185,
    186,
    187,
    188,
    189,

    190,
    191,
    192,
    193,
    194,
    195,
    196,
    197,
    198,
    199,

    200,
    201,
    202,
    203,
    204,
    205,
    206,
    207,
    208,
    209,

    210,
    211,
    212,
    213,
    214,
    215,
    216,
    217,
    218,
    219,

    220,
    221,
    222,
    223,
    224,
    225,
    226,
    227,
    228,
    229,

    230,
    231,
    232,
    233,
    234,
    235,
    236,
    237,
    238,
    239,

    240,
    241,
    242,
    243,
    244,
    245,
    246,
    247,
    248,
    249,

    250,
    251,
    252,
    253,
    254,
    255
]

const TRANSITION_MAPPINGS = { //ORDER matters
    [TRANSITION_TYPES.MILESTONE]:       {class: ()=>Milestone,  field: 'r_milestone_transition'},
    [TRANSITION_TYPES.ACCOUNT]:         {class: ()=>Account,    field: 'r_account'},
    [TRANSITION_TYPES.DEFINE_TOKEN]:    {class: ()=>Token,      field: 'r_token'},
    [TRANSITION_TYPES.CREATE_DAPP]:     {class: ()=>Dapp,       field: 'r_dapp'},
    [TRANSITION_TYPES.ISSUE]:           {class: ()=>Issue,      field: 'r_issue'},
    [TRANSITION_TYPES.BURN_TOKEN]:      {class: ()=>Burn,       field: 'r_burn'},
    [TRANSITION_TYPES.SUPPORT]:         {class: ()=>Support,    field: 'r_support'},
    [TRANSITION_TYPES.UPDATE_CHANNEL]:  {class: ()=>Channel,    field: 'r_channel'},
    [TRANSITION_TYPES.PAYMENT]:         {class: ()=>Payment,    field: 'r_payment'},
    [TRANSITION_TYPES.EXECUTE]:         {class: ()=>Execution,  field: 'r_execution'}
}

export default class Pack {
    public r_account: Account | undefined;
    public r_burn: Burn | undefined;
    public r_channel: Channel | undefined;
    public r_dapp: Dapp | undefined;
    public r_token: Token | undefined;
    public r_execution: Execution | undefined;
    public r_issue: Issue | undefined;
    public r_milestone_transition: Milestone | undefined;
    public r_payment: Payment | undefined;
    public r_support: Support | undefined;
    public r_author: string | undefined;
    public stable: boolean | undefined;
    public original_pack: Pack | undefined;

    public r_parents: string[] = [];
    public r_hash: string | undefined;
    public r_sig: string | undefined;
    public r_milestone: string | undefined;
    public r_size: number | undefined;
    public body: (Account | Burn | Channel | Dapp | Token | Execution | Issue | Milestone | Payment | Support)[] = [];

    async get_commissions(): Promise<bigint>{
        if (!is_string(this.r_author))
            throw new Error("Commissions cannot be calculated on a pack without an author");
        const stabilizers: Map<string, bigint> = await db.get_stabilizers();
        const base: bigint = BigInt(this.binary().length);
        return base*BigInt(stabilizers.size + (stabilizers.has(this.r_author) ? 0 : 1));
    }
    /**
     * Parses a Pack from binary. The binary blob must be a complete pack (signed, with parents, milestone...)
     * @param bin The binary blob encoding the pack
     * @throws Bad binary payload
     */
    static from_binary(bin: Uint8Array, original = true): Pack{
        const ret = new Pack();
        let offset: number = 0;
        if (bin.length < SIGNATURE_BYTE_LENGTH + ADDRESS_BYTE_LENGTH +1) //signature, author and parent count
            throw new Error("Bad binary payload");
        ret.r_author = buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
        ret.r_sig = buffer2string(bin.slice(offset, offset+=SIGNATURE_BYTE_LENGTH), 'base64url');
        const n_parents: number = bin[offset++] + 1;
        ret.r_milestone = buffer2string(bin.slice(offset, offset+=32), 'base64url');
        if (bin.length < offset+n_parents*32)
            throw new Error("Bad binary payload"); //Not enough bytes left to read the declared amount of parents + milestone
        for (let i=0;i<n_parents;i++)
            ret.r_parents.push(buffer2string(bin.slice(offset, offset+=32), 'base64url'));
        //console.table(binary);
        if (offset === bin.length)
            throw new Error("Bad binary payload"); //The pack does not contain any transition
        while (offset < bin.length){ //Parse transitions
            const pack_type: TRANSITION_TYPES = bin[offset]; //offset is not incremented here since it will be incremented at the end
            if (TRANSITION_MAPPINGS[pack_type] === undefined)
                throw new Error("Bad binary payload");
            const [transition, bytes_read] = TRANSITION_MAPPINGS[pack_type].class().from_binary(bin.slice(offset));
            if (this[TRANSITION_MAPPINGS[pack_type].field] !== undefined) //Duplicated transition
                throw new Error("Bad binary payload");
            ret[TRANSITION_MAPPINGS[pack_type].field] = transition;
            ret.body.push(transition);
            offset+=bytes_read;
        }
        if (offset !== bin.length) //There were unconsumed bytes, the pack is malformed
            throw new Error("Bad binary payload");
        ret.r_size = bin.length;
        ret.r_hash = createHash('sha256').update(bin).digest('base64url');
        ret.original_pack = original ? Pack.from_binary(bin, false) : undefined;
        return ret;
    }
    submit(): Promise<Option<string>> | Option<string>{
        try {
            return handle_incoming_pack(this.binary(false));
        } catch (e) {
            return {err: (<Error>e).message};
        }
    }
    constructor(binary?: Uint8Array) {
        if (binary === undefined) //User wanted to create an empty pack to manually fill it
            return this;
        return Pack.from_binary(binary);
    }
    /**
     * Serializes a pack to a binary blob
     * @param naked if true, excludes the signature from the resulting binary. This is useful to compute the signed hash which does not include the signature
     */
    binary(naked: boolean = false): Uint8Array{
        if (this.original_pack)
            return this.original_pack.binary(naked);
        if (!is_string(this.r_author))
            throw new Error("r_author must be set before converting a pack to binary");
        const ret: Uint8Array = new Uint8Array(
            Array.from(string2buffer(this.r_author, 'hex'))
                .concat(naked ? [] : this.r_sig ? Array.from(string2buffer(this.r_sig, 'base64url')) : [])
                .concat(this.r_parents.length-1)
                .concat(Array.from(string2buffer(this.r_milestone || '', 'base64url')))
                .concat(this.r_parents.reduce((acc: number[], cur)=>acc.concat(Array.from(string2buffer(cur, 'base64url'))), []))
                .concat(Object.values(TRANSITION_MAPPINGS).reduce((acc: number[], {field})=>this[field] === undefined ? acc : acc.concat(Array.from(this[field].binary())), []))
        );
        this.r_size = ret.length;
        return ret;
    }
    json(){
        return {
            author: this.r_author,
            milestone: this.r_milestone,
            stable: this.stable,
            size: this.binary().length,
            sig: this.r_sig,
            parents: this.r_parents,

            payment: this?.r_payment?.json(),
            token: this?.r_token?.json(),
            issue: this?.r_token?.json(),
            burn: this?.r_burn?.json(),
            support: this?.r_support?.json(),
            channel: this?.r_channel?.json(),
            account: this?.r_account?.json(),
            t_milestone: this?.r_milestone_transition?.json(),
            execution: this?.r_execution?.json(),
        }
    }
    private sign(privkey: string): Pack{
        const to_sign: Uint8Array = createHash('sha256').update(this.binary(true)).digest();
        this.r_sig = buffer2string(new Uint8Array(secp256k1.ecdsaSign(to_sign, string2buffer(privkey, 'hex')).signature.buffer), 'base64url');
        return this;
    }
    private hash(): Pack{
        this.r_hash = createHash('sha256').update(this.binary()).digest('base64url');
        return this;
    }
    pay(to: string, token: string, amount: bigint): Pack{
        if (!this.r_payment)
            this.r_payment = new Payment({[token]: {[to]: amount}});
        else
            this.r_payment.add(to, token, amount);
        return this;
    }
    account(pubkey: string): Pack{
        if (!this.r_account)
            this.r_account = new Account([pubkey]);
        else
            this.r_account.add(pubkey);
        return this;
    }
    burn(token: string, amount: bigint): Pack{
        if (!this.r_burn)
            this.r_burn = new Burn({[token]: amount});
        else
            this.r_burn.add(token, amount);
        return this;
    }
    parent(hash: string): Pack{
        this.r_parents.push(hash);
        this.r_parents.sort((a, b)=>toBigInt('0x'+reencode_string(a, 'base64url', 'hex')) < toBigInt('0x'+reencode_string(b, 'base64url', 'hex')) ? -1 : 1);
        return this;
    }
    channel(key: string, value: string): Pack{
        if (!this.r_channel)
            this.r_channel = new Channel({[key]: value});
        else
            this.r_channel.add(key, value);
        return this;
    }
    dapp(code: number[] | Uint8Array): Pack{
        if (!this.r_dapp)
            this.r_dapp = new Dapp([new Uint8Array(code)]);
        else
            this.r_dapp.add(new Uint8Array(code));
        return this;
    }
    token(token_definition: {cap: bigint, issuers: string[], burnable: boolean, nonce?: number}): Pack{
        const taken_nonces: Set<number> = new Set(this?.r_token?.payload ? this.r_token.payload.map(x=>x.nonce) : []);
        const token_nonce: number | undefined = token_definition.nonce === undefined ? possible_nonces.find(x=>!taken_nonces.has(x)) : token_definition.nonce;
        token_definition.nonce = token_nonce || DEFAULT_TOKEN_NONCE;
        if (!this.r_token)
            this.r_token = new Token([<{cap: bigint, issuers: string[], burnable: boolean, nonce: number}>token_definition]);
        else
            this.r_token.add(<{cap: bigint, issuers: string[], burnable: boolean, nonce: number}>token_definition);
        return this;
    }
    execute(address: string, params: Uint8Array[], gas_limit: number): Pack{
        if (!this.r_execution)
            this.r_execution = new Execution({[address]:{params: params, gas_limit}});
        else
            this.r_execution.add(address, params, gas_limit);
        return this;
    }
    issue(address: string, token: string,  amount: bigint): Pack{
        if (!this.r_issue)
            this.r_issue = new Issue({[token]: {[address]: amount}});
        else
            this.r_issue.add(address, token, amount);
        return this;
    }
    milestone(sigs: string[] | string, state_hash?: string): Pack{
        if (typeof sigs === "string")
            this.r_milestone = sigs;
        else
            this.r_milestone_transition = new Milestone(sigs, state_hash);
        return this;
    }
    support(address: string, amount: bigint): Pack{
        if (!this.r_support)
            this.r_support = new Support({[address]: amount});
        else
            this.r_support.add(address, amount);
        return this;
    }
    //TODO validate the pack here instead of in the handling function
    async is_valid(): Promise<boolean>{
        if (!is_string(this.r_author))
            return false;
        if (!await is_account_known(this.r_author))
            return false;
        if (!await are_all_parents_known(this))
            return false;

        const current_milestone: string = await db.get('milestone');
        const old_milestone: string = await db.get('previous_milestone');
        const parents: (Pack | undefined)[] = (await Promise.all(this.r_parents.map(x=>db.get_pack(x)))).map(x=>x.ok);
        if (!is_compact_array(parents)) //Handle the Option type
            return false;

        const parent_milestones: Set<string> = new Set<string>(parents.map(x=>x!.r_milestone_transition ? <string>(x!.r_hash) : <string>(x!.r_milestone)));

        if (parent_milestones.size > 2) //Packs referencing parents from 3 milestones are not allowed, we only keep 2 milestones in the DB
            return false;
        if (parent_milestones.size === 2 && (!parent_milestones.has(current_milestone) || !parent_milestones.has(old_milestone))) //Packs referencing parents from 2 milestones that are not the two latest milestones are not allowed
            throw new Error("The pack references parents from two milestones that are not the latest ones");
        if (parent_milestones.size === 2 && this.r_milestone !== current_milestone) //Packs referencing parents from two milestones must reference the latest milestone
            throw new Error("The pack references parents from the two latest milestones. However the pack milestone is set to the oldest one");
        if (parent_milestones.size === 1 && this.r_milestone !== parent_milestones.values().next().value) //Packs referencing parens from a single milestone must reference the latest milestone
            throw new Error("The pack references parents from a single milestone but its milestone is not that of the parents");
        //Todo check validity of every transition
        return true;
    }
    async apply(): Promise<void> {
        if (!is_string(this.r_author))
            throw new Error("An incomplete pack cannot be applied");
        const current_balance: bigint = await db.get_balance(this.r_author, BASE_TOKEN);
        const fees: bigint = await this.get_commissions();
        if (fees > current_balance)
            return;
        await this.r_milestone_transition?.apply(this);
        await this.r_execution?.apply(this);
        await this.r_account?.apply();
        await this.r_token?.apply(this);
        await this.r_dapp?.apply();
        await this.r_issue?.apply(this);
        await this.r_burn?.apply(this);
        await this.r_support?.apply(this);
        await this.r_channel?.apply(this);
        await this.r_payment?.apply(this);
    }
    async seal(privkey: string): Promise<Pack> {
        if (this.r_parents.length === 0) {
            const parents = await db.get_leaves();
            parents.forEach(leaf=>this.parent(leaf));
        }
        if (!this.r_milestone)
            this.milestone(await db.get_milestone());
        const pubkey: Uint8Array = secp256k1.publicKeyCreate(string2buffer(privkey, 'hex'));
        this.r_author = createHash('sha256').update(pubkey).digest('hex');
        if (!this.r_sig)
            this.sign(privkey);
        if (!this.r_hash)
            this.hash();
        return this;
    }
}