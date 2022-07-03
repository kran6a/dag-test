import { Router } from "express";
import type { Options } from "./types.js";
import createRouter from "./router.js";

export default createRouter;

export { createRouter };

/**
 * Routing middleware
 *
 * ```ts
 * app.use("/", router())
 * ```
 *
 * @param options An options object (optional)
 */
export const router = (options: Options = {}) => createRouter(Router(), options);

export { Options }