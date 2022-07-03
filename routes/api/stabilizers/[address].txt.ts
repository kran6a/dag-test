import {db} from "#db";
import {ADDRESS_BYTE_LENGTH} from "#constants";

export const get: Endpoint = async ({params}: {params: {address?: string}})=>{
    const address: string | undefined = params?.address;
    if (!address || address.length < ADDRESS_BYTE_LENGTH*2)
        return {status: 400, headers: {'content-type': 'application/json', 'content-length': 11}, body: 'Bad address'};
    const support: string = (await db.get_support(address)).toString();
    return {status: 200, headers: {'content-type': 'application/json', 'content-length': support.length}, body: support};
}