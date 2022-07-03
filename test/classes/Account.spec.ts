import {describe, it} from 'mocha';
import {assert} from 'chai';
import {buffer2string} from "#lib/serde";
import {randomBytes} from "crypto";
import {PUBKEY_BYTE_LENGTH, TRANSITION_TYPES} from "#constants";
import Account from "#classes/Account";

describe('[Classes] Account', async function (){
    it("should serialize and deserialize an account transition", ()=>{
        const pubkeys: string[] = Array.from({length: 4}).fill(undefined).map(x=>buffer2string(randomBytes(PUBKEY_BYTE_LENGTH), 'hex'));
        const account: Account = new Account(pubkeys);
        const binary: Uint8Array = account.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.ACCOUNT, 'Transition type is correctly set');
        assert.strictEqual(binary[1]+1, pubkeys.length);
        for (let i=0;i<pubkeys.length;i++)
            assert.strictEqual(buffer2string(binary.slice(2+i*PUBKEY_BYTE_LENGTH, 2+(i+1)*PUBKEY_BYTE_LENGTH), 'hex'), pubkeys[i], "Pubkeys were correctly encoded");
    });
    it("should instantiate an Account from a buffer", ()=>{
        const pubkeys: string[] = Array.from({length: 4}).fill(undefined).map(x=>buffer2string(randomBytes(PUBKEY_BYTE_LENGTH), 'hex'));
        const account: Account = new Account(pubkeys);
        const binary: Uint8Array = account.binary();

        const [account_from_binary, length]: [Account, number] = Account.from_binary(binary);
        assert.deepStrictEqual(account_from_binary.json(), {type: TRANSITION_TYPES.ACCOUNT, pubkeys});
        assert.strictEqual(length, binary.length);
    });
});