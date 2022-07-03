import {bigint2word, int2dop, string2buffer} from "#lib/serde";
import {OPS} from "./ops.js";
import {BASE_TOKEN} from "#constants";
import {is_array, is_bigint, is_empty_array, is_positive_bigint, is_string, is_valid_address, is_valid_base64url, is_valid_byte} from "#lib/validation";
import Channel from "#classes/Channel";

/**
 * @description Returns the code needed to perform a payment
 * @param amount Amount to pay, may be a byte expression pushing the amount into the stack
 * @param to Receiver address, may be a byte expression pushing the address into the stack
 * @param token The token to send, may be a byte expression pushing the token hash into the stack
 */
export const pay = ({amount, to, token}: {amount?: bigint | OPS[], to?: string | OPS[], token?: string | OPS[]}): number[]=>{
    if (is_valid_base64url(token) && token.length !== BASE_TOKEN.length)
        throw new Error("Bad token length");
    if (is_string(to) && !is_valid_address(to))
        throw new Error("Bad address length");
    if (is_bigint(amount) && !is_positive_bigint(amount))
        throw new Error("Bad amount");
    if ([amount, to, token].some(x=>is_array(x) && (is_empty_array(x) || !(<Array<any>>x).some(x=>is_valid_byte(x)))))
        throw new Error("Invalid array provided");

    const [is_amount_array, is_token_array, is_to_array]: [boolean, boolean, boolean] = <[boolean, boolean, boolean]>[amount, token, to].map(x=>is_array(x));

    return [
        (
            !is_to_array && !is_token_array && !is_amount_array
                ? OPS.PUSH3
                : !is_to_array && !is_token_array
                    ? OPS.PUSH2
                    : !is_to_array
                        ? OPS.PUSH
                        : []
        ),
        (is_to_array        ? <number[]>to      : [...Buffer.from(<string>to, 'hex')]),
        (is_to_array && !is_token_array && !is_amount_array && is_to_array ? OPS.PUSH2 : !is_token_array ? OPS.PUSH : []),
        (is_token_array     ? <number[]>token   : [...Buffer.from(<string>token, 'base64url')]),
        (is_token_array && !is_amount_array ? OPS.PUSH: []),
        (is_amount_array    ? <number[]>amount  : [...bigint2word(<bigint>amount)]),
        OPS.PAY
    ].flat();

    //return [OPS.PUSH3, ...bigint2word(BigInt('0x'+to)), ...bigint2word(BigInt('0x'+Buffer.from(token, 'base64url').toString('hex'))), ...bigint2word(amount), OPS.PAY];
}

/**
 * @description Returns the byte expression needed to push a byte array into the stack
 * @param bytes The byte array
 * @param reverse Whether to push the bytes in reverse order so that the first byte in the array is the first item that is popped during execution
 */
export const push_bytes = (bytes: Uint8Array | number[], reverse: boolean = false): number[]=>{
    const length: number = bytes.length;
    if (length > 65535)
        throw new Error("Max PUSH_B length is 65535");
    return reverse ? [OPS.PUSH_B, ...int2dop(length), ...[...bytes].reverse()] : [OPS.PUSH_B, ...bytes];
}

/**
 * @description Returns a byte expression that pushes the content of a channel into the stack
 * @param owner The owner of the data channel
 * @param key The channel key or name
 */
export const read_channel_by_owner = (owner: string, key: string): number[]=>{
    const channel_key: string = Channel.compute_key(owner, key);
    const key_bytes: Uint8Array = string2buffer(channel_key, 'binary');
    return [OPS.PUSH, ...key_bytes, OPS.R_CHANNEL];
}