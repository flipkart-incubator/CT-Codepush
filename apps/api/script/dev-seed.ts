// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// Seeds storage with default account, app, deployments, and access key for first-time dev setup.

import * as q from "q";
import * as storage from "./storage/storage";

const DEFAULT_ACCOUNT_EMAIL = "dev@example.com";
const DEFAULT_ACCOUNT_NAME = "Dev User";
const DEFAULT_APP_NAME = "MyApp";
const DEFAULT_ACCESS_KEY_NAME = "dev-access-key";
const ACCESS_KEY_EXPIRY_MS = 10 * 365 * 24 * 60 * 60 * 1000; // 10 years

/**
 * Seeds the storage with default account, app, Staging/Production deployments, and an access key
 * so the server works out of the box in development. Idempotent: skips if default account exists.
 */
export function seedDevStorage(storageInstance: storage.Storage): q.Promise<void> {
  return storageInstance.getAccountByEmail(DEFAULT_ACCOUNT_EMAIL).then(
    () => q<void>(undefined),
    () => doSeed(storageInstance)
  );
}

function doSeed(s: storage.Storage): q.Promise<void> {
  const now = Date.now();
  const account: storage.Account = {
    name: DEFAULT_ACCOUNT_NAME,
    email: DEFAULT_ACCOUNT_EMAIL,
    createdTime: now,
  };

  return s
    .addAccount(account)
    .then((accountId: string) => {
      const app: storage.App = { name: DEFAULT_APP_NAME, createdTime: now };
      return s.addApp(accountId, app).then((appWithId: storage.App) => ({ accountId, app: appWithId }));
    })
    .then(({ accountId, app }) => {
      const staging: storage.Deployment = { name: "Staging", key: `staging-${app.id}`, createdTime: now };
      const production: storage.Deployment = { name: "Production", key: `production-${app.id}`, createdTime: now };
      return q
        .all([s.addDeployment(accountId, app.id, staging), s.addDeployment(accountId, app.id, production)])
        .then(() => ({ accountId, app }));
    })
    .then(({ accountId }) => {
      const accessKey: storage.AccessKey = {
        name: DEFAULT_ACCESS_KEY_NAME,
        friendlyName: "Dev access key",
        createdBy: DEFAULT_ACCOUNT_EMAIL,
        createdTime: now,
        expires: now + ACCESS_KEY_EXPIRY_MS,
      };
      return s.addAccessKey(accountId, accessKey);
    })
    .then(() => {
      console.log(
        "[dev-seed] Default data created: account '%s', app '%s', deployments Staging/Production, access key '%s'.",
        DEFAULT_ACCOUNT_EMAIL,
        DEFAULT_APP_NAME,
        DEFAULT_ACCESS_KEY_NAME
      );
      return q<void>(undefined);
    });
}

export const DEV_DEFAULT_ACCESS_KEY_NAME = DEFAULT_ACCESS_KEY_NAME;
export const DEV_DEFAULT_ACCOUNT_EMAIL = DEFAULT_ACCOUNT_EMAIL;
