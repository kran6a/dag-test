import express from "express";
import createRouter from "express-file-router";
import {resolve} from 'path';
import {API_HOST, API_PORT, API_PROTOCOL} from "#constants";
import cors from "./decorators/cors.js";
import polyfills from "#polyfills";
export type {TRPC_ROUTER} from "#network";
import * as dotenv from 'dotenv';
dotenv.config();
Error.stackTraceLimit = Infinity;

const app = express();
app.use(express.raw({inflate: true, limit: '50mb', type: () => true}));
await createRouter(app, {directory: resolve('./routes'), afterware: [cors]})

app.listen(API_PORT, API_HOST);
console.info(`Server listening at ${API_PROTOCOL}://${API_HOST}:${API_PORT}`);