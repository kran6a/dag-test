import type { ParsedPath } from "path";
import type { Route } from "./types.js";
import config from "./config.js";

/**
 * @param parsedFile
 *
 * @returns Boolean Whether or not the file has to be excluded from route generation
 */
export const isFileIgnored = (parsedFile: ParsedPath) =>config.IGNORED_FILE_EXTENSIONS.some(x=>parsedFile.name.includes(x) || parsedFile.ext === x) || !config.VALID_FILE_EXTENSIONS.includes(parsedFile.ext.toLowerCase()) || parsedFile.name.startsWith(config.IGNORE_PREFIX_CHAR) || parsedFile.dir.startsWith(`/${config.IGNORE_PREFIX_CHAR}`)

/**
 * @param routes
 *
 * @returns An array of sorted routes based on their priority
 */
export const prioritizeRoutes = (routes: Route[]) =>routes.sort((a, b) => a.priority - b.priority);

/**
 * ```ts
 * mergePaths("/posts/[id]", "index.ts") -> "/posts/[id]/index.ts"
 * ```
 *
 * @param paths An array of mergeable paths
 *
 * @returns A unification of all paths provided
 */
export const mergePaths = (...paths: string[]) =>`/${paths.filter(path => path !== "").join("/")}`;

const regBackets = /\[([^}]*)\]/g;

const transformBrackets = (value: string) =>regBackets.test(value) ? value.replace(regBackets, (_, s) => `:${s}`) : value;

/**
 * @param path
 *
 * @returns A new path with all wrapping `[]` replaced by prefixed `:`
 */
export const convertParamSyntax = (path: string) => {
    const subpaths: string[] = [];

    for (const subpath of path.split("/"))
        subpaths.push(transformBrackets(subpath));

    return mergePaths(...subpaths);
}

/**
 * The smaller the number the higher the priority with zero indicating highest priority
 *
 * @param url
 *
 * @returns An integer ranging from 0 to Infinity
 */
export const calculatePriority = (url: string): number => {
    const depth = url.match(/\/.+?/g)?.length || 0;
    const specifity = url.match(/\/:.+?/g)?.length || 0;

    return depth + specifity;
}

export const getMethodKey = (method: string): string => {
    const methodKey = method.toLowerCase();

    if (methodKey === "del")
        return "delete";

    return methodKey
}