import {describe, it} from 'mocha';
import {assert} from 'chai';
import {buffer2string, dop2int, trop2int} from "#lib/serde";
import {ADDRESS_BYTE_LENGTH, COMMUNITY_ADDRESS, EMPTY_BUFFER, TRANSITION_TYPES} from "#constants";
import Execution from "#classes/Execution";
import {randomBytes} from "crypto";

describe('[Classes] Execution', async function (){
    it("should serialize and deserialize an account transition", ()=>{
        const payload = {
            [COMMUNITY_ADDRESS]: {
                params: [
                    new Uint8Array(randomBytes(11)),
                    EMPTY_BUFFER
                ],
                gas_limit: 1000
            },
            [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: {
                params: [
                    new Uint8Array(randomBytes(5)),
                    new Uint8Array(randomBytes(12))
                ],
                gas_limit: 2050
            }
        };
        const support: Execution = new Execution(payload);
        const binary: Uint8Array = support.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.EXECUTE, 'Transition type is correctly set');
        const smart_contract_count: number = binary[1] + 1; //+1 since the 0x00 byte means 1 (calling zero smart contracts is dumb)
        assert.strictEqual(smart_contract_count, Object.keys(payload).length, `There are ${Object.keys(payload).length} channel updates`);
        let offset: number = 2;
        const gas_limit: number = trop2int(binary.slice(offset, offset+=3)) +1; //+1 since 0x00 byte means 1 gas limit
        assert.strictEqual(gas_limit, Object.values(payload).reduce((acc, cur)=>Math.max(acc, cur.gas_limit), 0), 'gas_limit was correctly encoded');
        for (let i=0;i<smart_contract_count;i++){
            const address: string = buffer2string(binary.slice(offset, offset+=ADDRESS_BYTE_LENGTH), 'hex');
            assert.strictEqual(address, Object.keys(payload)[i]);
            const call_count: number = binary[offset++]+1; //+1 since the 0x00 byte means 1 (calling a smart contract address 0 times is dumb)
            assert.strictEqual(call_count, payload[address].params.length);
            for (let i=0;i<call_count;i++){
                const param_length: number = dop2int(binary.slice(offset, offset+=2));
                assert.strictEqual(param_length, payload[address].params[i].length);
                const params: Uint8Array = binary.slice(offset, offset+=param_length);
                assert.deepStrictEqual(Array.from(params), Array.from(payload[address].params[i]));
            }
        }
        assert.strictEqual(offset, binary.length, "The whole binary was consumed");
    });
    it("should instantiate an Execution from a buffer", ()=>{
        const payload = {
            [COMMUNITY_ADDRESS]: { params: [new Uint8Array(randomBytes(11)), EMPTY_BUFFER], gas_limit: 1000 },
            [buffer2string(randomBytes(ADDRESS_BYTE_LENGTH), 'hex')]: { params: [new Uint8Array(randomBytes(5)), new Uint8Array(randomBytes(12))], gas_limit: 2050 }
        };
        const support: Execution = new Execution(payload);
        const binary: Uint8Array = support.binary();

        const [execution_from_binary, length]: [Execution, number] = Execution.from_binary(binary);
        assert.deepStrictEqual(execution_from_binary.json(), {type: TRANSITION_TYPES.EXECUTE, calls: Object.fromEntries(Object.entries(payload).map(([key, value])=>[key, value.params])), gas_limit: Math.max(...Object.values(payload).map(x=>x.gas_limit))});
        assert.strictEqual(length, binary.length);
    });
});