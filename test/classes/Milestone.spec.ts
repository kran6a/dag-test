import {describe, it} from 'mocha';
import {assert} from 'chai';
import {buffer2string} from "#lib/serde";
import Milestone from "#classes/Milestone";
import {randomBytes} from "crypto";
import {SIGNATURE_BYTE_LENGTH, STABILIZER_COUNT, TRANSITION_TYPES} from "#constants";

describe('[Classes] Milestone', async function (){
    it("should serialize and deserialize a milestone", ()=>{
        const sigs: string[] = Array.from({length: STABILIZER_COUNT}).fill(undefined).map(x=>buffer2string(randomBytes(SIGNATURE_BYTE_LENGTH), 'base64url'));
        const state_hash: string = buffer2string(randomBytes(32), 'hex');
        const milestone: Milestone = new Milestone(sigs, state_hash);
        const binary = milestone.binary();
        assert.strictEqual(binary[0], TRANSITION_TYPES.MILESTONE, 'Transition type is correctly set');
        const sig_count: number = binary[1]+1;
        assert.strictEqual(sig_count, sigs.length, "Signature count is right");
        let offset: number = 2;
        for (let i=0;i<sig_count;i++)
            assert.strictEqual(buffer2string(binary.slice(offset, offset+=SIGNATURE_BYTE_LENGTH), 'base64url'), sigs[i], "Signatures were correctly encoded");
        assert.strictEqual(buffer2string(binary.slice(offset, offset+=32), 'hex'), state_hash, 'State hash was correctly encoded');
    });
    it("should instantiate a Milestone from a buffer", ()=>{
        const sigs: string[] = Array.from({length: STABILIZER_COUNT}).fill(undefined).map(x=>buffer2string(randomBytes(SIGNATURE_BYTE_LENGTH), 'base64url'));
        const state_hash: string = buffer2string(randomBytes(32), 'hex');
        const _milestone: Milestone = new Milestone(sigs, state_hash);
        const binary: Uint8Array = _milestone.binary();

        const [milestone, length]: [Milestone, number] = Milestone.from_binary(binary);
        assert.deepStrictEqual(milestone.json().state_hash, state_hash);
        assert.strictEqual(length, binary.length);
    });
});