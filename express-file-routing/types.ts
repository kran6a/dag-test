import type { Handler } from "express"

export interface Options {
    /**
     * The routes entry directory (optional)
     *
     * ```ts
     * createRouter(app, {
     *  directory: path.join(__dirname, "pages")
     * })
     * ```
     */
    directory?: string
    /**
     * Additional methods that match an export from a route like `ws`
     *
     * ```ts
     * // app.ts
     * import ws from "express-ws"
     *
     * const { app } = ws(express())
     *
     * createRouter(app, {
     *  // without this the exported ws handler is ignored
     *  additionalMethods: ["ws"]
     * })
     *
     * // /routes/room.ts
     * export const ws = (ws, req) => {
     *  ws.send("hello")
     * }
     * ```
     */
    additionalMethods?: string[],
    afterware?: ((response: Endpoint_Response)=>Endpoint_Response)[]
}

export interface File {
    name: string
    path: string
    rel: string
}

export interface Route {
    url: string
    priority: number
    exports: {
        all?: Endpoint
        get?: Endpoint
        post?: Endpoint
        put?: Endpoint
        patch?: Endpoint
        delete?: Endpoint
        [x: string]: Endpoint
    }
}