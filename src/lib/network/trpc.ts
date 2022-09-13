import {inferAsyncReturnType, initTRPC, TRPCError} from '@trpc/server';
import {CreateHTTPContextOptions, createHTTPServer} from '@trpc/server/adapters/standalone';
import {applyWSSHandler, CreateWSSContextFnOptions} from '@trpc/server/adapters/ws';
import {observable} from '@trpc/server/observable';
import {WebSocketServer} from 'ws';
import {db} from "#db";
import {buffer2string, string2buffer} from "#lib/serde";
import {is_array, is_ok, is_string, is_valid_address, is_valid_base64url} from "#lib/validation";
import Pack from "#classes/Pack";

export const RPC_SUBSCRIPTIONS = new Map();

// This is how you initialize a context for the server
function createContext(opts: CreateHTTPContextOptions | CreateWSSContextFnOptions) {
    return {};
}
type Context = inferAsyncReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();


const accountRouter = t.router({
    balance: t.procedure
        .input((params: any)=>{
            if (is_valid_address(params?.address) && params?.token === 'base' || is_valid_base64url(params?.token))
                return <{address: string, token: string}>params;
            throw new TRPCError({code: 'BAD_REQUEST', message: 'malformed request'});
        })
        .query(async (query)=>{
            return await db.get_balance(query.input.address, query.input.token);
        }),
    channel: t.procedure
        .input((params: any)=>{
            if (is_valid_address(params?.address) && typeof params?.key === 'string')
                return <{address: string, key: string}>params;
            throw new TRPCError({code: 'BAD_REQUEST', message: 'malformed request'});
        })
        .query(async (query)=>{
            return await db.get_channel(query.input.address, query.input.key);
        }),
});

const appRouter = t.router({
    account: accountRouter,
    token: t.procedure
        .input((val: unknown)=>{
            if (val === 'base' || is_valid_base64url(val))
                return val;
            throw new TRPCError({code: 'BAD_REQUEST', message: 'invalid token hash'});
        })
        .query(async (query)=>{
            const reponse = await db.get_token(query.input);
            if (!reponse.ok)
                throw new TRPCError({code: 'NOT_FOUND'});
        }),
    stabilizers: t.procedure.query(async ()=>{
        const stabilizers = await db.get_stabilizers();
        return Object.fromEntries(stabilizers.entries());
    }),
    pack: t.procedure
        .input((val: unknown)=>{
            if (typeof val === "string")
                return val;
            return '';
        })
        .query(async (query)=>{
            const pack = await db.get_pack(query.input);
            if (!pack.ok)
                throw new TRPCError({code: 'NOT_FOUND'});
            return buffer2string(pack.ok?.binary(), 'binary')
        }),
    submit: t.procedure
        .input((val)=>{
            if (typeof val !== "string")
                throw new TRPCError({code: 'BAD_REQUEST'});
            try {
                Pack.from_binary(string2buffer(val, 'binary'));
                return val;
            } catch (e){
                throw new TRPCError({code: 'BAD_REQUEST', message: 'malformed pack'});
            }
        })
        .mutation((payload)=>{
            const hydrated_pack: Pack = Pack.from_binary(string2buffer(payload.input, 'binary'));
            return hydrated_pack.submit();
        }),
    packs: t.procedure
        .subscription(()=>{
            return observable<string>((emit) => {
                const key: number = Date.now();
                RPC_SUBSCRIPTIONS.set(key, emit.next);
                return () => RPC_SUBSCRIPTIONS.delete(key);
            });
        }),
    leaves: t.procedure
        .query(async () => {
            return await db.get_leaves();
        }),
    sync: t.procedure
        .input(async (val: unknown)=>{
            if (!is_array(val))
                throw new TRPCError({code: "BAD_REQUEST", message: "leaves must be an array"});
            if (!val.every(x=>is_string(x)))
                throw new TRPCError({code: 'BAD_REQUEST', message: 'leaves must be an string array'})
            return val;
        })
        .subscription((req)=>observable<string>((emit)=>{
                const recurse = async (client_leaves: string[])=>{
                    const leaves_children = await Promise.all(client_leaves.map(x=>db.get_children_iterator(x)));
                    for (const children of leaves_children){
                        for (const pack of children) {
                            const opt_pack = await db.get_pack(pack.New);
                            if (!is_ok(opt_pack))
                                emit.error(new TRPCError({code: 'INTERNAL_SERVER_ERROR', message: opt_pack.err}));
                            else {
                                emit.next(buffer2string(opt_pack.ok.binary(), 'binary'));
                                setImmediate(recurse.bind(null,[pack.New]));
                            }
                        }
                    }
                }
            })
        )
});


const { server, listen } = createHTTPServer({router: appRouter, createContext, batching: {enabled: true}});
const wss = new WebSocketServer({ server });

export type TRPC_ROUTER = typeof appRouter;
applyWSSHandler<TRPC_ROUTER>({wss, router: appRouter, createContext, batching: {enabled: true}});

setInterval(() => {
  console.log('Connected clients', wss.clients.size);
}, 1000);
listen(2022);
