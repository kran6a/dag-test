import {describe, it} from 'mocha';
import {assert} from 'chai';
import {randomBytes} from "crypto";
import {bin2token, token2bin} from "#lib/serde";
import {MAX_CAP} from "#constants";

describe('[Serde] token', ()=>{
    it('should be biyective 1', function () {
        const token = {
            cap: 100n,
            burnable: false,
            issuers: Array.from({length: 32}).map(x=>randomBytes(32).toString('hex')),
        }
        //@ts-expect-error
        assert.deepStrictEqual(token, bin2token(token2bin(token)));
    });
    it('should be biyective 2', function () {
        const token = {
            cap: 100n,
            burnable: true,
            issuers: Array.from({length: 32}).map(x=>randomBytes(32).toString('hex')),
        }
        //@ts-expect-error
        assert.deepStrictEqual(token, bin2token(token2bin(token)));
    });
    it('should be biyective 3', function () {
        const token = {
            cap: MAX_CAP,
            burnable: true,
            issuers: [randomBytes(32).toString('hex')],
        }
        //@ts-expect-error
        assert.deepStrictEqual(token, bin2token(token2bin(token)));
    });
});