// noinspection DuplicatedCode

import {bigint2binary, bigint2word, binary2bigint, buffer2string, dop2int, qop2int, string2buffer} from "#lib/serde";
import {ADDRESS_BYTE_LENGTH, BALANCE_WIDTH_BYTES, BASE_TOKEN, MAX_CHANNEL_KEY_LENGTH_BYTES, MAX_INTEGER, MAX_TOKEN_ISSUER_COUNT, TOKEN_BYTE_LENGTH} from "#constants";
import {Vm} from "#vm";
import {createHash} from "crypto";
import {db} from '#db';
import {is_err} from "#lib/validation";
import {log} from "#lib/logger";

export const enum OPS {
    LABEL,
    NOP,
    ADD,
    SUB,
    DUP,
    DIV,
    MUL,
    MOD,
    PUSH,
    SWAP,
    DEC,
    GOTO,
    INC,
    AND,
    OR,
    NOT,
    XOR,
    SHIFTR,
    SHIFTL,
    SHIFTR_I,
    SHIFTL_I,
    ABORT,
    PAY,
    TOKEN_DEF,
    SENDER,
    CMP,
    JUMP_EQ,
    PUSH2,
    PUSH3,
    PUSH4,
    RETURN,
    JUMP_NEQ,
    JUMP_LT,
    JUMP_GT,
    JUMP_LTE,
    JUMP_GTE,
    R_CHANNEL,
    W_CHANNEL,
    PUSH5,
    SHA256,
    SHA512,
    SHA3,
    SELF,
    MLOAD,
    MSTORE,
    POP,
    SWAP2,
    SWAP3,
    SWAP4,
    SQRT,
    NROOT,
    LOG2,
    LOG10,
    NLOG,
    CALL,
    PUSH_B,
    INPUT,
    JOIN_B,
    PARAM,
    PARAM_1,
    PARAM_2,
    PARAM_3,
    PARAM_4,
    PARAM_5,
    PARAM_6,
    DBG,
}
export const enum EXCEPTIONS {
    UNEXECUTABLE_OPCODE = 0,
    ABORT,
    STACK_UNDERFLOW,
    DIVISION_BY_ZERO,
    RETURN,
    BAD_ENTRY,
    ILLEGAL_MEMORY_ACCESS,
    LIMIT_EXCEEDED,
    BAD_SEQUENCE,
    NOT_ENOUGH_BALANCE,
    BAD_CHANNEL_HASH,
    BAD_TOKEN_HASH,
}
export const Widths = {
    [OPS.PUSH]:         BALANCE_WIDTH_BYTES,
    [OPS.PUSH2]:        BALANCE_WIDTH_BYTES*2,
    [OPS.PUSH3]:        BALANCE_WIDTH_BYTES*3,
    [OPS.PUSH4]:        BALANCE_WIDTH_BYTES*4,
    [OPS.PUSH5]:        BALANCE_WIDTH_BYTES*5,
    [OPS.SHIFTL_I]:     BALANCE_WIDTH_BYTES,
    [OPS.SHIFTR_I]:     BALANCE_WIDTH_BYTES,
    [OPS.SHA256]:       1, // 1 byte
    [OPS.SHA512]:       1, // 1 byte
    [OPS.SHA3]:         1, // 1 byte
    [OPS.MSTORE]:       2, // 2 byte
    [OPS.MLOAD]:        2, // 2 byte
}


export const Ops = {
    [OPS.LABEL]:    (vm: Vm)=>{},
    [OPS.ADD]:      (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) + binary2bigint(vm.pop()))),
    [OPS.SUB]:      (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) - binary2bigint(vm.pop()))),
    [OPS.DUP]:      (vm: Vm)=>vm.push(vm.peek()),
    [OPS.DIV]:      (vm: Vm)=>{
        const top: bigint = binary2bigint(vm.pop());
        const down: bigint = binary2bigint(vm.pop());
        if (down === 0n)
            return vm.exception = EXCEPTIONS.DIVISION_BY_ZERO;
        vm.push(bigint2binary(top / down));
    },
    [OPS.MUL]:      (vm: Vm)=>{vm.push(bigint2binary(binary2bigint(vm.pop()) *  binary2bigint(vm.pop())))},
    [OPS.MOD]:      (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) %  binary2bigint(vm.pop()))),
    [OPS.SHIFTL]:   (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) << binary2bigint(vm.pop()))),
    [OPS.SHIFTR]:   (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) >> binary2bigint(vm.pop()))),
    [OPS.SHIFTL_I]: (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) << binary2bigint(vm.next_word()))),
    [OPS.SHIFTR_I]: (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop()) >> binary2bigint(vm.next_word()))),
    [OPS.ABORT]:    (vm: Vm)=>vm.exception = EXCEPTIONS.ABORT,
    [OPS.RETURN]:   (vm: Vm)=>vm.exception = EXCEPTIONS.RETURN,
    [OPS.PUSH_B]:   (vm: Vm)=>{
        const amount: number = dop2int(vm.next_dop());
        vm.pc+=2;
        for (let i=0;i<amount;i++) {
            vm.push(vm.next_op());
            vm.pc++;
        }
    },
    [OPS.JOIN_B]:   (vm: Vm)=>{
        const last: Uint8Array = vm.pop();
        const first: Uint8Array = vm.pop();
        vm.push(new Uint8Array([...first, ...last]))
    },
    [OPS.PUSH]:     (vm: Vm)=>vm.push(vm.next_word()),
    [OPS.PUSH2]:    (vm: Vm)=>{
        vm.push(vm.next_word(0));
        vm.push(vm.next_word(1));
    },
    [OPS.PUSH3]:    (vm: Vm)=>{
        vm.push(vm.next_word(0));
        vm.push(vm.next_word(1));
        vm.push(vm.next_word(2));
    },
    [OPS.PUSH4]:    (vm: Vm)=>{
        vm.push(vm.next_word(0));
        vm.push(vm.next_word(1));
        vm.push(vm.next_word(2));
        vm.push(vm.next_word(3));
    },
    [OPS.PUSH5]:    (vm: Vm)=>{
        vm.push(vm.next_word(0));
        vm.push(vm.next_word(1));
        vm.push(vm.next_word(2));
        vm.push(vm.next_word(3));
        vm.push(vm.next_word(4));
    },
    [OPS.DEC]:      (vm: Vm)=>{
        const n: bigint = binary2bigint(vm.pop());
        vm.push(bigint2binary(n === 0n ? MAX_INTEGER : n-1n));
    },
    [OPS.INC]:      (vm: Vm)=>vm.push(bigint2binary(binary2bigint(vm.pop())+1n)),
    [OPS.SWAP]:     (vm: Vm)=>{
        const head: Uint8Array = vm.pop();
        const pre_head: Uint8Array = vm.pop();
        vm.push(head);
        vm.push(pre_head);
    },
    [OPS.SWAP2]:    (vm: Vm)=>{
        if (vm.stack.length < 3) //Have to check here since we don't use .pop()
            return vm.exception = EXCEPTIONS.STACK_UNDERFLOW;
        const new_head: Uint8Array = <Uint8Array>vm.stack.at(-3);
        // noinspection UnnecessaryLocalVariableJS
        const old_head: Uint8Array = <Uint8Array>vm.stack.at(-1);
        vm.stack[vm.stack.length-3] = old_head;
        vm.stack[vm.stack.length-1] = new_head;
    },
    [OPS.SWAP3]:    (vm: Vm)=>{
        if (vm.stack.length < 4) //Have to check here since we don't use .pop()
            return vm.exception = EXCEPTIONS.STACK_UNDERFLOW;
        const new_head: Uint8Array = <Uint8Array>vm.stack.at(-4);
        // noinspection UnnecessaryLocalVariableJS
        const old_head: Uint8Array = <Uint8Array>vm.stack.at(-1);
        vm.stack[vm.stack.length-4] = old_head;
        vm.stack[vm.stack.length-1] = new_head;
    },
    [OPS.SWAP4]:    (vm: Vm)=>{
        if (vm.stack.length < 5) //Have to check here since we don't use .pop()
            return vm.exception = EXCEPTIONS.STACK_UNDERFLOW;
        const new_head: Uint8Array = <Uint8Array>vm.stack.at(-5);
        // noinspection UnnecessaryLocalVariableJS
        const old_head: Uint8Array = <Uint8Array>vm.stack.at(-1);
        vm.stack[vm.stack.length-5] = old_head;
        vm.stack[vm.stack.length-1] = new_head;
    },
    [OPS.XOR]:      (vm: Vm)=>{
        const a: Uint8Array = vm.pop();
        const b: Uint8Array = vm.pop();
        const result: Uint8Array = new Uint8Array(Math.max(a.length, b.length));
        for (let i = 0; i < result.length; ++i)
            result[i] = a[i] ^ b[i];
        vm.push(result);
    },
    [OPS.AND]:      (vm: Vm)=>{
        const a: Uint8Array = vm.pop();
        const b: Uint8Array = vm.pop();
        const result: Uint8Array = new Uint8Array(Math.max(a.length, b.length));
        for (let i = 0; i < result.length; ++i)
            result[i] = a[i] && b[i];
        vm.push(result);
    },
    [OPS.OR]:       (vm: Vm)=>{
        const a: Uint8Array = vm.pop();
        const b: Uint8Array = vm.pop();
        const result: Uint8Array = new Uint8Array(Math.max(a.length, b.length));
        for (let i = 0; i < result.length; ++i)
            result[i] = (a[i] || 0) || (b[i] || 0);
        vm.push(result);
    },
    [OPS.NOT]:      (vm: Vm)=>{
        const a: Uint8Array = vm.pop();
        const result: Uint8Array = new Uint8Array(a.length);
        for (let i = 0; i < result.length; ++i)
            result[i] = ~a[i];
        vm.push(result);
    },
    [OPS.DBG]: (vm: Vm)=>{
        console.log("DBG", vm.stack);
    },
    [OPS.PAY]:      async (vm: Vm)=>{
        const amount: bigint = binary2bigint(vm.pop());
        const raw_token: Uint8Array = vm.pop().slice(-TOKEN_BYTE_LENGTH); //Last 32 bytes
        const token: string = buffer2string(raw_token, 'base64url');
        const to: string = buffer2string(vm.pop().slice(-ADDRESS_BYTE_LENGTH), 'hex').padEnd(ADDRESS_BYTE_LENGTH*2, '0');
        log('VM', 'INFO', `${buffer2string(vm.address, 'hex')} paid ${amount} of ${token} to ${to}`);
        vm.output.pay(to, token, amount);
        const total: bigint = vm.output.r_payment!.sum(BASE_TOKEN);
        if (total > await db.get_balance(buffer2string(vm.address, 'hex'), token))
            vm.exception = EXCEPTIONS.NOT_ENOUGH_BALANCE;
    },
    [OPS.CMP]:      (vm: Vm)=>{
        const head: Uint8Array = vm.pop();
        const pre_head: Uint8Array = vm.pop();
        const result: -1 | 0 | 1 = Buffer.from(head).compare(pre_head);
        const buf: Buffer = Buffer.alloc(BALANCE_WIDTH_BYTES);
        buf.writeUint8(result+1, buf.length-1);
        vm.stack.push(buf);
    },
    [OPS.SENDER]:   (vm: Vm)=>vm.push(vm.caller),
    [OPS.R_CHANNEL]:async (vm: Vm)=>{
        const channel_key: Uint8Array = vm.pop();
        if (channel_key.length !== 32)
            return vm.exception = EXCEPTIONS.BAD_CHANNEL_HASH;
        const value: Uint8Array = string2buffer(await db.get_channel_raw(buffer2string(channel_key, 'binary')), 'binary');
        if (value.length === 0)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.push(value);
    },
    [OPS.W_CHANNEL]:(vm: Vm)=>{
        const channel_value_length: number = dop2int(vm.next_dop());
        vm.pc+=2;
        const channel_key_length: number = dop2int(vm.next_dop());
        vm.pc+=2;
        if (channel_key_length > MAX_CHANNEL_KEY_LENGTH_BYTES)
            return vm.exception = EXCEPTIONS.LIMIT_EXCEEDED;
        const channel_value: Uint8Array[] = [];
        const channel_key: Uint8Array[] = [];
        for (let i=0;i<channel_key_length;i++)
            channel_key.push(vm.pop());
        for (let i=0;i<channel_value_length;i++)
            channel_value.push(vm.pop());
        vm.output.channel(buffer2string(channel_key.reduce((acc, cur)=>new Uint8Array([...acc, ...cur]), new Uint8Array), 'binary'), buffer2string(channel_value.reduce((acc, cur)=>new Uint8Array([...acc, ...cur])), 'binary'))
    },
    [OPS.GOTO]:     (vm: Vm)=>{
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length-1)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_EQ]:  (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        if (Buffer.from(cmp2).compare(cmp1) !== 0)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_NEQ]: (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        if (Buffer.from(cmp2).compare(cmp1) === 0)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_LT]:  (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        if (Buffer.from(cmp2).compare(cmp1) !== -1)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_GT]:  (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        if (Buffer.from(cmp2).compare(cmp1) !== 1)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_LTE]: (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        const result = Buffer.from(cmp2).compare(cmp1);
        if (result === 1)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.JUMP_GTE]: (vm: Vm)=>{
        const cmp2: Uint8Array = vm.pop();
        const cmp1: Uint8Array = vm.pop();
        const result = Buffer.from(cmp2).compare(cmp1);
        if (result === -1)
            return vm.pc+=4;                   //Skip next qop
        const where: number = qop2int(vm.next_qop());
        if (where > vm.code.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.pc = where;
    },
    [OPS.TOKEN_DEF]:(vm: Vm)=>{
        const burnable: boolean = vm.pop().slice(-1)[0] === 1;
        const cap: bigint = binary2bigint(vm.pop()); //1 byte only
        const number_of_issuers: number = vm.pop().slice(-1)[0]; //1 byte only
        if (number_of_issuers > MAX_TOKEN_ISSUER_COUNT)
            return vm.exception = EXCEPTIONS.LIMIT_EXCEEDED;
        const issuers: string[] = [];
        for (let i=0;i<number_of_issuers;i++) {
            const address: string = buffer2string(vm.pop().slice(-32), 'hex');
            !issuers.some(x=>x === address) && issuers.push(address); //Deduplicate issuers
        }
        vm.output.token({cap, burnable, issuers});  //nonces are automatically set in increasing order
    },
    [OPS.SHA256]:   (vm: Vm)=>{
        const length: number = vm.next_op()[0];
        if (length === 0 || length === undefined)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const hash = createHash('sha256');
        for (let i=0;i<length;++i)
            hash.update(vm.pop());
        const final: Uint8Array = hash.digest();
        let prev: number = 0;
        if (BALANCE_WIDTH_BYTES < 32) {
            for (let i = 0; i < 32 / BALANCE_WIDTH_BYTES; i++) {
                const word: Uint8Array = final.slice(prev, prev + BALANCE_WIDTH_BYTES);
                prev += BALANCE_WIDTH_BYTES;
                vm.push(word);
            }
        }
        else if (BALANCE_WIDTH_BYTES === 32)
            vm.push(final);
        else
            vm.push(new Uint8Array([...new Uint8Array(BALANCE_WIDTH_BYTES - 32), ...final]));
    },
    [OPS.SHA512]:   (vm: Vm)=>{
        const length: number = vm.next_op()[0];
        if (length === 0 || length === undefined)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const hash = createHash('sha512');
        for (let i=0;i<length;++i)
            hash.update(vm.pop());
        const final: Uint8Array = hash.digest();
        let prev: number = 0;
        if (BALANCE_WIDTH_BYTES < 64) {
            for (let i = 0; i < 64 / BALANCE_WIDTH_BYTES; i++) {
                const word: Uint8Array = final.slice(prev, prev + BALANCE_WIDTH_BYTES);
                prev += BALANCE_WIDTH_BYTES;
                vm.push(word);
            }
        }
        //@ts-ignore
        else if (BALANCE_WIDTH_BYTES === 64){
            vm.push(final);
        }
        else {
            vm.push(new Uint8Array([...new Uint8Array(BALANCE_WIDTH_BYTES - 64), ...final]));
        }
    },
    [OPS.SHA3]:     (vm: Vm)=>{
        const length: number = vm.next_op()[0];
        if (length === 0 || length === undefined)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const hash = createHash('sha3-256');
        for (let i=0;i<length;++i)
            hash.update(vm.pop());
        const final: Uint8Array = hash.digest();
        let prev: number = 0;
        if (BALANCE_WIDTH_BYTES < 32) {
            for (let i = 0; i < 32 / BALANCE_WIDTH_BYTES; i++) {
                const word: Uint8Array = final.slice(prev, prev + BALANCE_WIDTH_BYTES);
                prev += BALANCE_WIDTH_BYTES;
                vm.push(word);
            }
        }
        else if (BALANCE_WIDTH_BYTES === 32)
            vm.push(final);
        else
            vm.push(new Uint8Array([...new Uint8Array(BALANCE_WIDTH_BYTES - 32), ...final]));
    },
    [OPS.SELF]:     (vm: Vm)=>vm.push(vm.address),
    [OPS.MLOAD]:    (vm: Vm)=>{
        const dop: Uint8Array = vm.next_dop();
        if (dop.length !== 2)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        const slot: number = dop2int(dop);
        if (slot > vm.memory.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.push(vm.memory[slot]);
    },
    [OPS.MSTORE]:   (vm: Vm)=>{
        const dop: Uint8Array = vm.next_dop();
        if (dop.length !== 2)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        const slot: number = dop2int(dop);
        if (slot > vm.memory.length)
            return vm.exception = EXCEPTIONS.ILLEGAL_MEMORY_ACCESS;
        vm.memory[slot] = vm.pop();
    },
    [OPS.POP]:      (vm: Vm)=>vm.pop(),
    [OPS.SQRT]:     (vm: Vm)=>{
        const value: bigint = binary2bigint(vm.pop());
        if (value < 2n)
            return value;
        if (value < 16n)
            return BigInt(Math.floor(Math.sqrt(Number(value))));

        let x1: bigint = value < (1n << 52n) ? BigInt(Math.floor(Math.sqrt(Number(value))))-3n : (1n << 52n) - 2n;
        let x0: bigint = -1n;
        while((x0 !== x1 && x0 !== (x1 - 1n))){
            x0 = x1;
            x1 = ((value / x0) + x0) >> 1n;
        }
        vm.push(bigint2binary(x0));
    },
    [OPS.NROOT]:    (vm: Vm)=>{ //UNTESTED
        const k: bigint = binary2bigint(vm.pop());
        let x: bigint =  binary2bigint(vm.pop());
        let o: bigint = 0n; // old approx value
        while(x**k!==k && x!==o) {
            o=x;
            x = ((k-1n)*x + x/x**(k-1n))/k;
        }
        return x;
    },
    [OPS.LOG2]:     (vm: Vm)=>{
        const value: bigint = binary2bigint(vm.pop());
        if (value === 0n)
            return vm.exception = EXCEPTIONS.DIVISION_BY_ZERO; //TODO change
        vm.push(bigint2binary(BigInt(value.toString(2).length - 1)));
    },
    [OPS.LOG10]:    (vm: Vm)=>{
        const value: bigint = binary2bigint(vm.pop());
        if (value === 0n)
            return vm.exception = EXCEPTIONS.DIVISION_BY_ZERO; //TODO change
        vm.push(bigint2binary(BigInt(value.toString(10).length - 1)));
    },
    /**
     * @description Integer logarithm in base 1-36
     */
    [OPS.NLOG]:     (vm: Vm)=>{
        const base: number = vm.next_op()[0];
        if (!base)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        if (base > 36)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const value: bigint = binary2bigint(vm.pop());
        if (value === 0n)
            return vm.exception = EXCEPTIONS.DIVISION_BY_ZERO; //TODO change
        vm.push(bigint2binary(BigInt(value.toString(base).length - 1)));
    },
    [OPS.CALL]:     async (vm: Vm)=>{
        const address: string = buffer2string(vm.next_word().slice(-ADDRESS_BYTE_LENGTH), 'hex');
        vm.pc+=ADDRESS_BYTE_LENGTH;
        if (address === buffer2string(vm.address, 'hex')) //A dapp cannot call itself
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const entry: Uint8Array = vm.next_qop();
        vm.pc+=4;
        const code: Uint8Array = await db.get_smart_contract(address);
        if (code.length === 0)
            return vm.exception = EXCEPTIONS.BAD_SEQUENCE;
        const child_vm: Vm = new Vm(code, buffer2string(vm.caller, 'hex'), vm.gas_limit, vm.stack.concat(entry), vm.output?.r_payment?.to_address(address) || new Map());
        //Brain surgery
        child_vm.op_count = vm.op_count;
        child_vm.gas = vm.gas;
        const result: Option<Uint8Array, EXCEPTIONS> = await child_vm.execute(false);
        if (is_err(result))
            return vm.exception = result.err;
        vm.pc++;
        vm.op_count = child_vm.op_count;
        vm.gas_limit = child_vm.gas_limit;
        vm.stack = child_vm.stack;
        vm.stack.push(result.ok);
    },
    [OPS.INPUT]:    (vm: Vm)=>{
        const token: Uint8Array = vm.pop();
        if (token.length !== TOKEN_BYTE_LENGTH)
            return vm.exception = EXCEPTIONS.BAD_TOKEN_HASH;
        const token_string: string = buffer2string(token, 'base64url');
        const amount: bigint = vm.input.get(token_string) || 0n;
        vm.push(bigint2word(amount));
    }
}

//TODO set more realistic prices
export const Gas = {
    [OPS.LABEL]:    0,
    [OPS.ADD]:      1,
    [OPS.SUB]:      1,
    [OPS.DUP]:      1,
    [OPS.DIV]:      1,
    [OPS.MUL]:      1,
    [OPS.MOD]:      2,
    [OPS.SHIFTL]:   1,
    [OPS.SHIFTR]:   1,
    [OPS.SHIFTL_I]: 1,
    [OPS.SHIFTR_I]: 1,
    [OPS.ABORT]:    0,
    [OPS.RETURN]:   0,
    [OPS.PUSH]:     1,
    [OPS.PUSH2]:    1,
    [OPS.PUSH3]:    1,
    [OPS.PUSH4]:    1,
    [OPS.PUSH5]:    1,
    [OPS.DEC]:      1,
    [OPS.INC]:      1,
    [OPS.SWAP]:     1,
    [OPS.SWAP2]:    1,
    [OPS.SWAP3]:    1,
    [OPS.SWAP4]:    1,
    [OPS.XOR]:      1,
    [OPS.AND]:      1,
    [OPS.OR]:       1,
    [OPS.NOT]:      1,
    [OPS.PAY]:      1200,
    [OPS.CMP]:      1,
    [OPS.SENDER]:   1,
    [OPS.R_CHANNEL]:16,
    [OPS.W_CHANNEL]:(vm: Vm)=>vm.peek().length + 64, //Value size + 32 bytes (key) + 32 overhead
    [OPS.GOTO]:     2,
    [OPS.JUMP_EQ]:  2,
    [OPS.JUMP_NEQ]: 2,
    [OPS.JUMP_LT]:  2,
    [OPS.JUMP_GT]:  2,
    [OPS.JUMP_LTE]: 2,
    [OPS.JUMP_GTE]: 2,
    [OPS.TOKEN_DEF]:6400,
    [OPS.SHA256]:   32,
    [OPS.SHA512]:   64,
    [OPS.SHA3]:     96,
    [OPS.SELF]:     1,
    [OPS.MLOAD]:    2,
    [OPS.MSTORE]:   2,
    [OPS.POP]:      1,
    [OPS.SQRT]:     4,
    [OPS.NROOT]:    44,
    [OPS.LOG2]:     16,
    [OPS.LOG10]:    16,
    [OPS.NLOG]:     16,
    [OPS.CALL]:     1,
    [OPS.PUSH_B]:   (vm: Vm)=>Math.ceil(vm.next_op()[0] / (BALANCE_WIDTH_BYTES*5)),
    [OPS.INPUT]:    1,
    [OPS.JOIN_B]:   2,
    [OPS.DBG]:      1
}