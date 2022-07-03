import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, MAX_CAP} from "#constants";


export const string2buffer = (str: string, encoding: 'utf8' | 'utf-8' | 'binary' | 'base64url' | 'latin1' | 'latin-1' | 'hex'): Uint8Array=>{
    if (encoding === 'hex')
        return new Uint8Array(str.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    if (encoding === 'base64url'){
        const m: number = str.length % 4;
        // noinspection JSDeprecatedSymbols
        return Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (m === 0 ? 0 : 4 - m), '=')).split('').map(c => c.charCodeAt(0)));
    }
    if (encoding === 'binary')
        return new Uint8Array(str.split('').map((x)=>x.charCodeAt(0)));
    if (encoding === 'utf8' || encoding === 'utf-8')
        return new TextEncoder().encode(str);
}

export const buffer2string = (arr: Uint8Array, encoding: 'utf8' | 'utf-8' | 'binary' | 'base64url' | 'latin1' | 'latin-1' | 'hex'): string => {
    if (encoding === 'hex')
        return arr.reduce((acc, i)=>acc +('0' + i.toString(16)).slice(-2), '')
    if (encoding === 'base64url') {
        // noinspection JSDeprecatedSymbols
        return btoa(Array.from(arr, b => String.fromCharCode(b)).join(''))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    if (encoding === 'binary' || encoding === 'latin1' || encoding === 'latin-1')
        return  String.fromCharCode.apply(null, Array.from(arr));
    return new TextDecoder(encoding === 'utf8' ? 'utf-8' : encoding).decode(arr);
}

export const reencode_string = (str: string, source_encoding: 'utf8' | 'utf-8' | 'binary' | 'base64url' | 'latin1' | 'latin-1' | 'hex', ourput_encoding: 'utf8' | 'utf-8' | 'binary' | 'base64url' | 'latin1' | 'latin-1' | 'hex'): string=>{
    return buffer2string(string2buffer(str, source_encoding), ourput_encoding);
}

/**
 * @description Serializes a JSON object that may contain bigints as values into a string for IO purposes
 * @param data The object
 */
export const toJSON = (data: object): string=>JSON.stringify(data, (key, value: any)=>(typeof value === "bigint" || (typeof value === 'string' && /^\d+n$/.test(value))) ? value.toString() + (value.toString().at(-1) === 'n' ? '' : "n") : value);
/**
 * @description Deserializes a JSON string that may contain base10 encoded bigints as values. Base10 encoded bigints must have the "n" suffix
 * @param str
 */
export const fromJSON = (str: string): object=>JSON.parse(str, (key, value)=>(typeof value === "string" && /^\d+n$/.test(value)) ? BigInt(value.slice(0, value.length - 1)) : value);
/**
 * @description Converts a string to a bigint. It accepts any base 10 or 16 number string
 * @description Base 16 numbers must be prefixed with 0x
 * @description No checks are done on the string to ensure it is a valid base 10 bigint string
 * @param str The string that will be parsed
 * @return The parsed bigint
 */
export const toBigInt = (str: string): bigint=>BigInt(str.at(-1) === 'n' ? str.slice(0, -1) : str);
/**
 * @description Converts a Buffer into a bigint
 * @param buf The buffer
 */
export const binary2bigint = (buf: Uint8Array): bigint=>BigInt('0x'+buffer2string(buf, 'hex').padStart(BALANCE_WIDTH_BYTES*2, '0'));
/**
 * @description Converts a bigint into a Buffer padded or truncated to BALANCE_WIDTH bits
 * @param n The bigint
 * @param width The width of the binary buffer
 */
export const bigint2binary = (n: bigint, width: number = BALANCE_WIDTH_BYTES): Uint8Array=>{
    const hex: string = n.toString(16).padStart(width*2, '0').slice(width*-2);
    return string2buffer(hex, 'hex');
}
/**
 * @description Converts a bigint into a word (byte sequence of length BALANCE_WIDTH_BYTES bytes)
 * @param n The bigint
 * @param word_size
 */
export const bigint2word = (n: bigint, word_size = BALANCE_WIDTH_BYTES): Uint8Array=>{
    const u8: Uint8Array = string2buffer(n.toString(16).padStart(word_size*2, '0'), 'hex');
    return u8.slice(u8.length-word_size, u8.length);
}
/**
 * @description Converts an integer into a quad-op (4 byte value)
 * @param n The integer
 */
export const int2qop = (n: number): Uint8Array=>{
    const hex: string = n.toString(16).padStart(8, '0');
    return string2buffer(hex, 'hex').slice(0, 4); //4 bytes
}
/**
 * @description Converts a 4 byte buffer encoding a quad-op into an integer
 * @param buf
 */
export const qop2int = (buf: Uint8Array): number=>Number('0x'+buffer2string(buf, 'hex').padStart(8, '0'));
/**
 * @description Converts an integer into a double-op (2 bytes value)
 * @param n The integer
 */
export const int2dop = (n: number): Uint8Array=>{
    const hex: string = n.toString(16).padStart(4, '0');
    return string2buffer(hex, 'hex').slice(0, 2); //2 bytes
}
/**
 * @description Converts a 2 byte buffer encoding a double-op into an integer
 * @param buf
 */
export const dop2int = (buf: Uint8Array): number=>Number('0x'+buffer2string(buf, 'hex').padStart(4, '0'));
export const int2trop = (n: number): Uint8Array=>{
    const hex: string = n.toString(16).padStart(6, '0');
    return string2buffer(hex, 'hex').slice(0, 3); //3 bytes
}
export const trop2int = (buf: Uint8Array): number=>Number('0x'+buffer2string(buf, 'hex').padStart(6, '0'));
/**
 * @description Serializes a token into a binary string
 * @param token The token
 */
export const token2bin = (token: {cap: bigint, issuers: string[], burnable: boolean, nonce: number}): Uint8Array=>{
    const is_cap_explicit: boolean = <boolean>(token.cap && token.cap !== MAX_CAP);
    const cap: Uint8Array = is_cap_explicit ? bigint2word(token.cap - 1n) : new Uint8Array([]);
    const burnable: number = is_cap_explicit //0 & 1 -> burnable, 2 & 3 -> non burnable
        ? token.burnable
            ? 0
            : 2
        : token.burnable
            ? 1
            : 3;
    const issuer_buffs: number[] = token.issuers.map(x=>[...bigint2word(BigInt('0x'+x), ADDRESS_BYTE_LENGTH)]).flat();
    return new Uint8Array([burnable, ...cap, token.issuers.length -1, ...issuer_buffs, token.nonce]);
}
/**
 * @description Deserializes a binary string into ParsedToken
 * @param bin The binary string
 */
export const bin2token = (bin: Uint8Array): {cap: bigint, burnable: boolean, issuers: string[]}=>{
    const burnable: boolean = bin[0] < 2;
    const is_cap_explicit: boolean = bin[0] === 0 || bin[0] === 2;
    let offset: number = 1;
    const cap: bigint = is_cap_explicit ? binary2bigint(bin.slice(offset, offset+=BALANCE_WIDTH_BYTES)) +1n : MAX_CAP;
    const issuer_count = bin[offset++]+1;
    const issuers: string[] = [];
    for (let i=0;i<issuer_count;i++)
        issuers.push(buffer2string(bin.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex'));
    return {cap, burnable, issuers};
}