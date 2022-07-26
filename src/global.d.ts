import {TRANSITION_TYPES} from "#constants";
import type {Readable} from "stream";
import type {Request} from 'express'
import type Account from "#classes/Account";
import type Channel from "#classes/Channel";
import type Burn from "#classes/Burn";
import type Dapp from "#classes/DAPP";
import type Milestone from "#classes/Milestone";
import type Issue from "#classes/Issue";
import type Payment from "#classes/Payment";
import type Execution from "#classes/Execution";
import type Support from "#classes/Support";
import type Token from "#classes/Token";



declare global {
	type NonUndefined<T> = T extends undefined ? never : T;
	type Endpoint_Response = {
		status: number,
		headers?: Record<string, string | number>,
		body?: string | Uint8Array
	}
	type Endpoint = ({params, request, url}: {params: Partial<{ [x: string]: string }>, request: Request, url: URL})=>Endpoint_Response | Promise<Endpoint_Response>
	type Override<T1, T2> = Omit<T1, keyof T2> & T2;
	type RocksDB = {
		get: (arg0: string) => Promise<string>,
		put: (arg0: string, arg1: string) => Promise<void>,
		del: (arg0: string) => Promise<void>,
		createReadStream: () => Readable,
		on: (event_name: string, cb: (key: string, value: string)=>void)=>void,
		open: ()=>Promise<void>,
		batch: (ops?: ({type: 'del', key: string} | {type: 'put', key: string, value: string})[], cb?: (err: Error)=>void)=>RocksDBTransaction
		close: ()=>Promise<void>
	}
	type RocksDBTransaction = {
		put: (key: string, value: string)=>RocksDBTransaction,
		del: (key: string)=>RocksDBTransaction,
		write: ()=>Promise<void>,
		get: (key: string)=>Promise<string>
	}
	type Option<OK, ERR = string> = {err: ERR, ok?: undefined} | {ok: OK, err?: undefined}
	type ParsedToken = {
		hash?: string,
		cap: bigint,
		burnable: boolean,
		issuers: string[],
		supply?: bigint
	}
	type Transition =  Account | Burn | Channel | Dapp | Token | Execution | Issue | Milestone | Payment | Support;
	namespace Transitions {
		type Stabilizer_Support = {
			type: TRANSITION_TYPES.SUPPORT,
			support: Record<string, string>
		}
		type Account = {
			type: TRANSITION_TYPES.ACCOUNT,
			pubkeys: string[]
		}
		type Payment = {
			type: TRANSITION_TYPES.PAYMENT,
			payment: Record<string, Record<string, string>>
		}
		type Token_Definition = {
			type: TRANSITION_TYPES.DEFINE_TOKEN,
			tokens: {
				cap?: string,
				burnable?: boolean,
				issuers: string[],
				nonce?: string
			}[]
		}
		type Token_Issue = {
			type: TRANSITION_TYPES.ISSUE,
			issue: Record<string, Record<string, string>>
		}
		type Token_Burn = {
			type: TRANSITION_TYPES.BURN_TOKEN,
			burn: Record<string, string>
		}
		type Dapp = {
			type: TRANSITION_TYPES.CREATE_DAPP,
			codes: number[][]
		}
		type Sapp = {
			type: TRANSITION_TYPES.CREATE_SAPP,
			stabilizers: string[],
			nonce?: string,
			commissions: Record<string, string>
		}
		type Update_Data_Channel = {
			type: TRANSITION_TYPES.UPDATE_CHANNEL,
			kv: Record<string, string>
		}
		type Milestone = {
			type: TRANSITION_TYPES.MILESTONE,
			sigs: Array<string>,
			state_hash: string
		}
		type Cross_Branch_Transfer = {
			type: TRANSITION_TYPES.XBRANCH_TRANSFER,
			dest: string,
			payments: Record<string, Record<string, Record<string, string>>>
		}
		type Execute = {
			type: TRANSITION_TYPES.EXECUTE,
			calls: Array<{address: string, params: string[], gas_limit: number}>
		}
	}
}