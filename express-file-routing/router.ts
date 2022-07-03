import path from "path";
import config from "./config.js";
import type { Application, Request, Response } from "express";
import type { Options } from "./types.js";

import { generateRoutes, walkTree } from "./lib.js";
import { getMethodKey } from "./utils.js";

const REQUIRE_MAIN_FILE: string = path.dirname(process.cwd());

/**
 * Attach routes to an Express app or router instance
 *
 * ```ts
 * createRouter(app)
 * ```
 *
 * @param app An express app or router instance
 * @param options An options object (optional)
 */
const createRouter = async (app: Application, options: Options = { afterware: []}): Promise<Application>=>{
    const files = walkTree(options.directory || path.join(REQUIRE_MAIN_FILE, "routes"));
    const routes = await generateRoutes(files);

    for (const {url, exports} of routes) {
        const exportedMethods = Object.entries(exports);

        for (const [method, handler] of exportedMethods) {
            const methodKey = getMethodKey(method);
            if (!options.additionalMethods?.includes(methodKey) && !config.DEFAULT_METHOD_EXPORTS.includes(methodKey))
                continue;

            const wrapper_handler = async (req: Request, res: Response): Promise<void>=>{
                const {body = '', headers = {}, status = 500}: Endpoint_Response = await options.afterware.reduce(async (acc, cur)=>{
                    if ((<Promise<Endpoint_Response>>acc)?.then)
                        return (<Promise<Endpoint_Response>>acc).then((response: Endpoint_Response)=>{
                            const {body = '', headers = {}, status = 500}: Endpoint_Response = cur(response);
                            return {body: (<Endpoint_Response>acc).body || body, headers: {...(<Endpoint_Response>acc).headers, ...headers}, status: status || (<Endpoint_Response>acc).status};
                        });
                    const {body = '', headers = {}, status = 500}: Endpoint_Response = cur(<Endpoint_Response>acc);
                    return {body: (<Endpoint_Response>acc).body || body, headers: {...(<Endpoint_Response>acc).headers, ...headers}, status: status || (<Endpoint_Response>acc).status};
                }, handler({request: req, params: req.params, url: new URL('http://localhost'+req.originalUrl)}));
                res.status(status || 500);
                Object.entries(headers).forEach(([key, value])=>res.setHeader(key, value));
                res.send(body);
            }
            app[methodKey](url, wrapper_handler);
        }
    }

    return app;
}

export default createRouter;