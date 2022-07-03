import {describe, it} from 'mocha';
import {assert} from 'chai';
import {qop2int} from "#lib/serde";
import {TRANSITION_TYPES} from "#constants";
import Dapp from "#classes/DAPP";

describe('[Classes] Dapp', async function (){
    it("should serialize and deserialize a Dapp deployment transition", ()=>{
        const payload: Uint8Array[] = [new Uint8Array([1,2,3]), new Uint8Array([2,1,3])];
        const support: Dapp = new Dapp(payload);
        const binary: Uint8Array = support.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.CREATE_DAPP, 'Transition type is correctly set');
        const number_of_entries: number = binary[1]+1;
        assert.strictEqual(number_of_entries, Object.entries(payload).length, `There are ${Object.entries(payload).length} dapps`);
        let offset: number = 2;
        let codes_read: number = 0;
        while (codes_read < number_of_entries){
            const code_size: number = qop2int(binary.slice(offset, offset+=4))+1;
            const code: Uint8Array = binary.slice(offset, offset+=code_size);
            assert.deepStrictEqual(Array.from(code), Array.from(payload[codes_read]), 'The code was correctly decoded');
            codes_read++;
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate a Dapp from a buffer", ()=>{
        const payload: Uint8Array[] = [new Uint8Array([1,2,3]), new Uint8Array([2,1,3])];
        const support: Dapp = new Dapp(payload);
        const binary: Uint8Array = support.binary();

        const [dapp_from_binary, length]: [Dapp, number] = Dapp.from_binary(binary);
        assert.deepStrictEqual(dapp_from_binary.json(), {type: TRANSITION_TYPES.CREATE_DAPP, codes: payload.map(x=>Array.from(x))});
        assert.strictEqual(length, binary.length);
    });
});