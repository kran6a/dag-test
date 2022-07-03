import {BALANCE_WIDTH_BYTES, BINARY_ZERO, EMPTY_BUFFER, MAX_VM_OPS_PER_CALL} from "#constants";
import {EXCEPTIONS, Gas, OPS, Ops, Widths} from "./ops.js";
import Pack from "#classes/Pack";
import {buffer2string, qop2int, string2buffer} from "#lib/serde";
import Dapp from "#classes/DAPP";
import {log} from "#lib/logger";

export class Vm {
    code: Uint8Array;
    pc: number;
    stack: Array<Uint8Array> = [];
    exception: EXCEPTIONS | undefined;
    output: Pack = new Pack();
    caller: Uint8Array;
    address: Uint8Array;
    op_count: number = 0;
    /**Remaining gas**/
    gas: number = 0;
    gas_limit: number;
    input: Map<string, bigint>
    memory: Array<Uint8Array> = <Array<Uint8Array>>Array.from({length: 1024}).fill(new Uint8Array(BALANCE_WIDTH_BYTES)); //1024 words
    constructor(code: Uint8Array, caller: string, gas_limit: number, params: Uint8Array[], inputs: Map<string, bigint> = new Map()) {
        const entry: number = params.length >= 1 ? qop2int(<Uint8Array>params.shift()) : 0;
        this.stack = params ? params : [EMPTY_BUFFER];
        this.code = code;
        this.pc = entry;
        this.gas_limit = gas_limit;
        this.address = string2buffer(Dapp.compute_address(code), 'hex');
        this.caller = string2buffer(caller, 'hex');
        this.input = inputs;
    }
    /**
     * @description Reads a word (BALANCE_WIDTH_BYTES bytes long) at the given offset
     * @param offset The offset to start reading from
     */
    word(offset: number): Uint8Array{
        if (offset+BALANCE_WIDTH_BYTES > this.code.length) {
            this.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
            return BINARY_ZERO;
        }
        return this.code.slice(offset, offset+BALANCE_WIDTH_BYTES);
    }
    /**
     * @description Reads the op (1 byte) immediately following the PC
     */
    next_op(): Uint8Array{
        return this.code.slice(this.pc, this.pc+1); //8 bit number
    }
    /**
     * @description Reads the double-op (2 byte) immediately following the PC
     */
    next_dop(): Uint8Array{
        return this.code.slice(this.pc, this.pc+2); //16 bit number
    }
    /**
     * @description Reads the quad-op (4 byte) immediately following the PC
     */
    next_qop(): Uint8Array{
        return this.code.slice(this.pc, this.pc+4); //32 bit number
    }
    /**
     * @description Reads the next word at position offset after the PC
     * @description CAUTION: offset skips full words not bytes
     * @param offset The number of words to skip
     */
    next_word(offset: number = 0): Uint8Array{
        return this.word(this.pc + offset*BALANCE_WIDTH_BYTES);
    }
    async execute(entry: boolean = true): Promise<Option<Uint8Array, EXCEPTIONS>> {
        const op: OPS = this.code[this.pc];
        if (entry && op !== OPS.LABEL) { //Cannot start from anything but a label. TODO check that the entry is an OP instead of an immediate value
            log('VM', 'ERROR', `Execution started from offset ${this.pc} which is not a label`);
            return {err: EXCEPTIONS.BAD_ENTRY};
        }
        this.pc += 1; //Increase due to reading op;

        const width: number = Widths[op] || 0;
        if (Ops[op] === undefined) {
            log('VM', 'ERROR', 'Unexecutable opcode');
            return {err: EXCEPTIONS.UNEXECUTABLE_OPCODE};
        }

        this.gas += typeof Gas[op] === 'number' ? Gas[op] : Gas[op](this); //Gas is incremented before the op execution
        if (this.gas > this.gas_limit || this.op_count > MAX_VM_OPS_PER_CALL) {
            log('VM', 'ERROR', `Gas limit of ${this.gas_limit} exceeded`);
            return {err: EXCEPTIONS.LIMIT_EXCEEDED};
        }

        log('VM', 'INFO', `Executing opcode ${op}, ${JSON.stringify([...this.code])}`);
        await Ops[op](this);
        this.op_count++;
        this.pc += width; //Increase due to consuming words or qops during op evaluation
        if (this.exception !== undefined && this.exception !== EXCEPTIONS.RETURN) {
            log('VM', 'ERROR', `Execution threw an exception with id ${this.exception}`);
            return {err: this.exception};
        }
        if (this.pc > this.code.length) {
            log('VM', 'ERROR', `Execution aborted due to tape overflow`);
            return {err: EXCEPTIONS.ILLEGAL_MEMORY_ACCESS};
        }
        if (this.exception === EXCEPTIONS.RETURN || this.pc === this.code.length) { //Execution ended
            log('VM', 'INFO', `Successfully executed ${buffer2string(this.address, 'hex')}`);
            if (this.output)
                this.output.r_author = buffer2string(this.address, 'hex');
            return {ok: this.stack.pop()};
        }
        return this.execute(false);
    }
    push(buf: Uint8Array): void {
        this.stack.push(buf);
    }
    pop(): Uint8Array {
        if (this.stack.length === 0) {
            this.exception = EXCEPTIONS.STACK_UNDERFLOW;
            return BINARY_ZERO; //Return dirty buffer
        }
        return this.stack.pop();
    }
    /**
     * @description Non-destructive pop()
     */
    peek(index: number = 1): Uint8Array {
        return this.stack.at(-index);
    }
}







const fastModularExponentiation = (a: bigint, b: bigint, n: bigint, gas_limit: number): bigint=>{
    a = a % n;
    let result: bigint = 1n;
    let x: bigint = a;
    let gas_remaining: number = gas_limit;
    while(b > 0){
        const leastSignificantBit = b % 2n;
        b = b / 2n;
        if (leastSignificantBit === 1n) {
            result = result * x;
            result = result % n;
        }
        x = x * x;
        x = x % n;
        gas_remaining-=100;
    }
    return result;
};
