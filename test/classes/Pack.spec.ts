import {describe, it} from 'mocha';
import Pack from "#classes/Pack";
import {ADDRESS_BYTE_LENGTH, BASE_TOKEN, COMMUNITY_ADDRESS, TOKEN_BYTE_LENGTH} from "#constants";
import {randomBytes} from "crypto";
import {buffer2string} from "#lib/serde";
import {assert} from "chai";

describe('[Classes] Pack', async function (){
    it("should work", async ()=>{
        const asset: string = buffer2string(randomBytes(TOKEN_BYTE_LENGTH), 'base64url');
        const address: string = buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex');
        const pack = await new Pack()
            .parent(buffer2string(randomBytes(32), 'base64url'))
            .pay(COMMUNITY_ADDRESS, BASE_TOKEN, 1000n)
            .pay(address, BASE_TOKEN, 12n)
            .pay(COMMUNITY_ADDRESS, asset, 66n)
            .pay(address, asset, 99n)
            .support(address, 100n)
            .support(COMMUNITY_ADDRESS, 10000n)
            .burn(asset, 100n)
            .burn(BASE_TOKEN, 55n)
            .seal(buffer2string(randomBytes(32), 'hex'))
        assert.deepStrictEqual(pack.r_payment.payload, {
            [BASE_TOKEN]: {
                [COMMUNITY_ADDRESS]: 1000n,
                [address]: 12n
            },
            [asset]: {
                [COMMUNITY_ADDRESS]: 66n,
                [address]: 99n
            }
        }, 'Payment was correctly encoded');
        const pack2 = new Pack(pack.binary());
        assert.deepStrictEqual(pack2.r_support.payload, {[COMMUNITY_ADDRESS]: 10000n, [address]: 100n});
        assert.deepStrictEqual(pack2.r_burn.payload, {[BASE_TOKEN]: 55n, [asset]: 100n});
    });
});