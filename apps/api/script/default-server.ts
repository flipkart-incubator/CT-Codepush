/* eslint-disable no-unused-vars */
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import * as api from "./api";
import { fileUploadMiddleware } from "./file-upload-manager";
import { RedisManager } from "./redis-manager";
import { InMemoryRedisManager } from "./in-memory-redis-manager";
import { Storage, Account } from "./storage/storage";
import { Response } from "express";

import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
const domain = require("express-domain-middleware");
import * as express from "express";
import * as q from "q";
import { RedisS3Storage } from "./storage/redis-s3-storage";
import { JsonStorage } from "./storage/json-storage";
import { seedDevStorage, DEV_DEFAULT_ACCOUNT_EMAIL } from "./dev-seed";
import * as cors from "cors";


function bodyParserErrorHandler(err: any, req: express.Request, res: express.Response, next: Function): void {
  if (err) {
    if (err.message === "invalid json" || (err.name === "SyntaxError" && ~err.stack.indexOf("body-parser"))) {
      req.body = null;
      next();
    } else {
      next(err);
    }
  } else {
    next();
  }
}

function isDevelopmentMode(useJsonStorage?: boolean): boolean {
  return process.env.NODE_ENV === "development" || useJsonStorage === true;
}

export function start(done: (err?: any, server?: express.Express, storage?: Storage) => void, useJsonStorage?: boolean): void {
  let storage: Storage;

  const isDev = isDevelopmentMode(useJsonStorage);

  q<void>(null)
    .then(async () => {
      if (isDev) {
        storage = new JsonStorage(true, true); // disablePersistence (in-memory), devMode (checkHealth passes)
      } else {
        storage = new RedisS3Storage();
      }
    })
    .then(() => (isDev ? seedDevStorage(storage) : q<void>(undefined)))
    .then(() => (isDev ? storage.getAccountByEmail(DEV_DEFAULT_ACCOUNT_EMAIL) : q<Account | null>(null)))
    .then((devAccount: Account | null) => {
      const devAccountId: string = devAccount ? devAccount.id : "default";
      const app = express();
      
      // Set trust proxy early to ensure proper IP detection for rate limiting and other middleware
      app.set('trust proxy', 1);
      
      app.use(cors());
      const auth = api.auth({ storage: storage });
      const appInsights = api.appInsights();
      const redisManager = isDev ? new InMemoryRedisManager() : new RedisManager();
      // First, to wrap all requests and catch all exceptions.
      app.use(domain);

      // Monkey-patch res.send and res.setHeader to no-op after the first call and prevent "already sent" errors.
      app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
        const originalSend = res.send;
        const originalSetHeader = res.setHeader;
        res.setHeader = (name: string, value: string | number | readonly string[]): Response => {
          if (!res.headersSent) {
            originalSetHeader.apply(res, [name, value]);
          }

          return {} as Response;
        };

        res.send = (body: any) => {
          if (res.headersSent) {
            return res;
          }

          return originalSend.apply(res, [body]);
        };

        next();
      });

      if (process.env.LOGGING) {
        app.use((req: express.Request, res: express.Response, next: (err?: any) => void): any => {
          console.log(); // Newline to mark new request
          console.log(`[REST] Received ${req.method} request at ${req.originalUrl}`);
          next();
        });
      }

      // Enforce a timeout on all requests.
      app.use(api.requestTimeoutHandler());

      // Before other middleware which may use request data that this middleware modifies.
      app.use(api.inputSanitizer());

      // Cookie parser middleware
      app.use(cookieParser());

      // body-parser must be before the Application Insights router.
      app.use(bodyParser.urlencoded({ extended: true }));
      const jsonOptions: any = { limit: "10kb", strict: true };
      if (process.env.LOG_INVALID_JSON_REQUESTS === "true") {
        jsonOptions.verify = (req: express.Request, res: express.Response, buf: Buffer, encoding: string) => {
          if (buf && buf.length) {
            (<any>req).rawBody = buf.toString();
          }
        };
      }

      app.use(cors());
      app.use(bodyParser.json(jsonOptions));

      // If body-parser throws an error, catch it and set the request body to null.
      app.use(bodyParserErrorHandler);

      // Before all other middleware to ensure all requests are tracked.
      app.use(appInsights.router());

      app.get("/", (req: express.Request, res: express.Response, next: (err?: Error) => void): any => {
        res.send("Welcome to the CodePush REST API!");
      });

      app.set("etag", false);
      app.set("views", __dirname + "/views");
      app.set("view engine", "ejs");
      app.use("/auth/images/", express.static(__dirname + "/views/images"));
      app.use(api.headers({ origin: process.env.CORS_ORIGIN || "http://localhost:4000" }));
      app.use(api.health({ storage: storage, redisManager: redisManager }));

      if (process.env.DISABLE_ACQUISITION !== "true") {
        app.use(api.acquisition({ storage: storage, redisManager: redisManager }));
      }

      if (process.env.DISABLE_MANAGEMENT !== "true") {
        if (isDev || process.env.DEBUG_DISABLE_AUTH === "true") {
          app.use((req, res, next) => {
            const userId: string = process.env.DEBUG_USER_ID || devAccountId;
            req.user = {
              id: userId,
            };

            next();
          });
          app.use(fileUploadMiddleware, api.management({ storage: storage, redisManager: redisManager })); 
        } else {
          app.use(auth.router());
          app.use(auth.authenticate, fileUploadMiddleware, api.management({ storage: storage, redisManager: redisManager }));
        }
      } else {
        app.use(auth.legacyRouter());
      }

      // Error handler needs to be the last middleware so that it can catch all unhandled exceptions
      app.use(appInsights.errorHandler);

      done(null, app, storage);
    })
    .done();
}
