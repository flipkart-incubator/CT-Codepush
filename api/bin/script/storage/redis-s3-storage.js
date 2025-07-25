"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisS3Storage = void 0;
const express = require("express");
const fs = require("fs");
const q = require("q");
const storage = require("./storage");
var clone = storage.clone;
var Promise = q.Promise;
const storage_1 = require("./storage");
const path = require("path");
const ioredis_1 = require("ioredis");
const storage_2 = require("@google-cloud/storage");
function merge(original, updates) {
    for (const property in updates) {
        original[property] = updates[property];
    }
}
class RedisS3Storage {
    static NextIdNumber = 0;
    accounts = {};
    apps = {};
    deployments = {};
    packages = {};
    blobs = {};
    accessKeys = {};
    deploymentKeys = {};
    accountToAppsMap = {};
    appToAccountMap = {};
    emailToAccountMap = {};
    appToDeploymentsMap = {};
    deploymentToAppMap = {};
    deploymentKeyToDeploymentMap = {};
    accountToAccessKeysMap = {};
    accessKeyToAccountMap = {};
    accessKeyNameToAccountIdMap = {};
    static CollaboratorNotFound = "The specified e-mail address doesn't represent a registered user";
    redisClient;
    googleStorageClient;
    googleBucket;
    _blobServerPromise;
    updatesDir = path.join(__dirname, "updates");
    constructor() {
        this.redisClient = new ioredis_1.default({
            host: process.env.REDIS_HOST,
            port: 6379,
            enableOfflineQueue: false,
            lazyConnect: false
        });
        q.all([storage.getAccessSecret(process.env.GOOGLE_CLIENT_EMAIL), storage.getAccessSecret(process.env.GOOGLE_PRIVATE_KEY)]).then(([GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY]) => {
            // Initialize Google Cloud Storage client with service account credentials
            const googleCredentials = {
                client_email: GOOGLE_CLIENT_EMAIL || "",
                private_key: GOOGLE_PRIVATE_KEY ? GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : "",
                project_id: process.env.GOOGLE_PROJECT_ID || "",
            };
            this.googleStorageClient = new storage_2.Storage({
                projectId: process.env.GOOGLE_PROJECT_ID,
                credentials: googleCredentials,
            });
            this.googleBucket = this.googleStorageClient.bucket(process.env.GOOGLE_BUCKET_NAME || "ct-code-push");
            if (!fs.existsSync(this.updatesDir)) {
                fs.mkdirSync(this.updatesDir);
            }
            this.loadStateAsync();
            setInterval(() => {
                this.loadStateAsync();
            }, 2000);
        });
    }
    loadStateAsync() {
        return this.redisClient.get("state").then((state) => {
            if (!state) {
                return;
            }
            const obj = JSON.parse(state);
            RedisS3Storage.NextIdNumber = obj.NextIdNumber || 0;
            this.accounts = obj.accounts || {};
            this.apps = obj.apps || {};
            this.deployments = obj.deployments || {};
            this.deploymentKeys = obj.deploymentKeys || {};
            this.blobs = obj.blobs || {};
            this.accountToAppsMap = obj.accountToAppsMap || {};
            this.appToAccountMap = obj.appToAccountMap || {};
            this.emailToAccountMap = obj.emailToAccountMap || {};
            this.appToDeploymentsMap = obj.appToDeploymentsMap || {};
            this.deploymentToAppMap = obj.deploymentToAppMap || {};
            this.deploymentKeyToDeploymentMap = obj.deploymentKeyToDeploymentMap || {};
            this.accessKeys = obj.accessKeys || {};
            this.accessKeyToAccountMap = obj.accessKeyToAccountMap || {};
            this.accountToAccessKeysMap = obj.accountToAccessKeysMap || {};
            this.accessKeyNameToAccountIdMap = obj.accessKeyNameToAccountIdMap || {};
        });
    }
    async saveStateAsync() {
        this.accountToAppsMap = {
            ...this.accountToAppsMap,
            'id_0': Array.from(new Set([...this.accountToAppsMap['id_0'], 'id_89']))
        };
        const obj = {
            NextIdNumber: RedisS3Storage.NextIdNumber,
            accounts: this.accounts,
            apps: this.apps,
            deployments: this.deployments,
            blobs: this.blobs,
            accountToAppsMap: this.accountToAppsMap,
            appToAccountMap: this.appToAccountMap,
            appToDeploymentsMap: this.appToDeploymentsMap,
            deploymentToAppMap: this.deploymentToAppMap,
            deploymentKeyToDeploymentMap: this.deploymentKeyToDeploymentMap,
            accessKeys: this.accessKeys,
            accessKeyToAccountMap: this.accessKeyToAccountMap,
            accountToAccessKeysMap: this.accountToAccessKeysMap,
            accessKeyNameToAccountIdMap: this.accessKeyNameToAccountIdMap,
            emailToAccountMap: this.emailToAccountMap
        };
        const str = JSON.stringify(obj);
        this.redisClient.set("state", str);
    }
    checkHealth() {
        return q(null);
    }
    addAccount(account) {
        account = clone(account); // pass by value
        account.id = this.newId();
        // We lower-case the email in our storage lookup because Partition/RowKeys are case-sensitive, but in all other cases we leave
        // the email as-is (as a new account with a different casing would be rejected as a duplicate at creation time)
        const email = account.email.toLowerCase();
        if (this.accounts[account.id] || this.accountToAppsMap[account.id] || this.emailToAccountMap[email]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.AlreadyExists);
        }
        this.accountToAppsMap[account.id] = [];
        this.emailToAccountMap[email] = account.id;
        this.accounts[account.id] = account;
        this.saveStateAsync();
        return q(account.id);
    }
    getAccount(accountId) {
        if (!this.accounts[accountId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q(clone(this.accounts[accountId]));
    }
    getAccountByEmail(email) {
        for (const id in this.accounts) {
            if (this.accounts[id].email === email) {
                return q(clone(this.accounts[id]));
            }
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    updateAccount(email, updates) {
        if (!email)
            throw new Error("No account email");
        return this.getAccountByEmail(email).then((account) => {
            merge(this.accounts[account.id], updates);
            this.saveStateAsync();
        });
    }
    getAccountIdFromAccessKey(accessKey) {
        if (!this.accessKeyNameToAccountIdMap[accessKey]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        if (new Date().getTime() >= this.accessKeyNameToAccountIdMap[accessKey].expires) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.Expired, "The access key has expired.");
        }
        return q(this.accessKeyNameToAccountIdMap[accessKey].accountId);
    }
    addApp(accountId, app) {
        app = clone(app); // pass by value
        const account = this.accounts[accountId];
        console.log(account, "account");
        if (!account) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        app.id = this.newId();
        const map = {};
        map[account.email] = { accountId: accountId, permission: "Owner" };
        app.collaborators = map;
        const accountApps = this.accountToAppsMap[accountId];
        if (accountApps.indexOf(app.id) === -1) {
            accountApps.push(app.id);
        }
        if (!this.appToDeploymentsMap[app.id]) {
            this.appToDeploymentsMap[app.id] = [];
        }
        this.appToAccountMap[app.id] = accountId;
        this.apps[app.id] = app;
        this.saveStateAsync();
        return q(clone(app));
    }
    getApps(accountId) {
        const appIds = this.accountToAppsMap[accountId];
        if (appIds) {
            const storageApps = appIds.map((id) => {
                return this.apps[id];
            });
            const apps = clone(storageApps);
            apps.forEach((app) => {
                this.addIsCurrentAccountProperty(app, accountId);
            });
            return q(apps);
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    getApp(accountId, appId) {
        if (!this.accounts[accountId] || !this.apps[appId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        const app = clone(this.apps[appId]);
        this.addIsCurrentAccountProperty(app, accountId);
        return q(app);
    }
    removeApp(accountId, appId) {
        if (!this.accounts[accountId] || !this.apps[appId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        if (accountId !== this.appToAccountMap[appId]) {
            throw new Error("Wrong accountId");
        }
        const deployments = this.appToDeploymentsMap[appId].slice();
        const promises = [];
        deployments.forEach((deploymentId) => {
            promises.push(this.removeDeployment(accountId, appId, deploymentId));
        });
        return q.all(promises).then(() => {
            delete this.appToDeploymentsMap[appId];
            const app = clone(this.apps[appId]);
            const collaborators = app.collaborators;
            Object.keys(collaborators).forEach((emailKey) => {
                this.removeAppPointer(collaborators[emailKey].accountId, appId);
            });
            delete this.apps[appId];
            delete this.appToAccountMap[appId];
            const accountApps = this.accountToAppsMap[accountId];
            accountApps.splice(accountApps.indexOf(appId), 1);
            this.saveStateAsync();
            return q(null);
        });
    }
    updateApp(accountId, app, ensureIsOwner = true) {
        app = clone(app); // pass by value
        if (!this.accounts[accountId] || !this.apps[app.id]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        this.removeIsCurrentAccountProperty(app);
        merge(this.apps[app.id], app);
        this.saveStateAsync();
        return q(null);
    }
    transferApp(accountId, appId, email) {
        if ((0, storage_1.isPrototypePollutionKey)(email)) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.Invalid, "Invalid email parameter");
        }
        return this.getApp(accountId, appId).then((app) => {
            const account = this.accounts[accountId];
            const requesterEmail = account.email;
            const targetOwnerAccountId = this.emailToAccountMap[email.toLowerCase()];
            if (!targetOwnerAccountId) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound, RedisS3Storage.CollaboratorNotFound);
            }
            // Use the original email stored on the account to ensure casing is consistent
            email = this.accounts[targetOwnerAccountId].email;
            if (this.isOwner(app.collaborators, email)) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.AlreadyExists);
            }
            app.collaborators[requesterEmail].permission = storage.Permissions.Collaborator;
            if (this.isCollaborator(app.collaborators, email)) {
                app.collaborators[email].permission = storage.Permissions.Owner;
            }
            else {
                app.collaborators[email] = { permission: storage.Permissions.Owner, accountId: targetOwnerAccountId };
                this.addAppPointer(targetOwnerAccountId, app.id);
            }
            return this.updateApp(accountId, app);
        });
    }
    addCollaborator(accountId, appId, email) {
        if ((0, storage_1.isPrototypePollutionKey)(email)) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.Invalid, "Invalid email parameter");
        }
        return this.getApp(accountId, appId).then((app) => {
            if (this.isCollaborator(app.collaborators, email) || this.isOwner(app.collaborators, email)) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.AlreadyExists);
            }
            const targetCollaboratorAccountId = this.emailToAccountMap[email.toLowerCase()];
            if (!targetCollaboratorAccountId) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound, RedisS3Storage.CollaboratorNotFound);
            }
            // Use the original email stored on the account to ensure casing is consistent
            email = this.accounts[targetCollaboratorAccountId].email;
            app.collaborators[email] = { accountId: targetCollaboratorAccountId, permission: storage.Permissions.Collaborator };
            this.addAppPointer(targetCollaboratorAccountId, app.id);
            return this.updateApp(accountId, app);
        });
    }
    getCollaborators(accountId, appId) {
        return this.getApp(accountId, appId).then((app) => {
            return q(app.collaborators);
        });
    }
    removeCollaborator(accountId, appId, email) {
        return this.getApp(accountId, appId).then((app) => {
            if (this.isOwner(app.collaborators, email)) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.AlreadyExists);
            }
            const targetCollaboratorAccountId = this.emailToAccountMap[email.toLowerCase()];
            if (!this.isCollaborator(app.collaborators, email) || !targetCollaboratorAccountId) {
                return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
            }
            this.removeAppPointer(targetCollaboratorAccountId, appId);
            delete app.collaborators[email];
            return this.updateApp(accountId, app, /*ensureIsOwner*/ false);
        });
    }
    addDeployment(accountId, appId, deployment) {
        deployment = clone(deployment); // pass by value
        const app = this.apps[appId];
        if (!this.accounts[accountId] || !app) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        deployment.id = this.newId();
        deployment.packageHistory = [];
        const appDeployments = this.appToDeploymentsMap[appId];
        if (appDeployments.indexOf(deployment.id) === -1) {
            appDeployments.push(deployment.id);
        }
        this.deploymentToAppMap[deployment.id] = appId;
        this.deployments[deployment.id] = deployment;
        this.deploymentKeyToDeploymentMap[deployment.key] = deployment.id;
        this.saveStateAsync();
        return q(deployment.id);
    }
    getDeploymentInfo(deploymentKey) {
        const deploymentId = this.deploymentKeyToDeploymentMap[deploymentKey];
        const deployment = this.deployments[deploymentId];
        if (!deploymentId || !deployment) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        const appId = this.deploymentToAppMap[deployment.id];
        if (!appId) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q({ appId: appId, deploymentId: deploymentId });
    }
    getPackageHistoryFromDeploymentKey(deploymentKey) {
        console.log(this.deploymentKeyToDeploymentMap);
        const deploymentId = this.deploymentKeyToDeploymentMap[deploymentKey];
        if (!deploymentId || !this.deployments[deploymentId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q(clone(this.deployments[deploymentId].packageHistory));
    }
    getDeployment(accountId, appId, deploymentId) {
        if (!this.accounts[accountId] || !this.apps[appId] || !this.deployments[deploymentId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q(clone(this.deployments[deploymentId]));
    }
    getDeployments(accountId, appId) {
        const deploymentIds = this.appToDeploymentsMap[appId];
        if (this.accounts[accountId] && deploymentIds) {
            const deployments = deploymentIds.map((id) => {
                return this.deployments[id];
            });
            return q(clone(deployments));
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    removeDeployment(accountId, appId, deploymentId) {
        if (!this.accounts[accountId] || !this.apps[appId] || !this.deployments[deploymentId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        if (appId !== this.deploymentToAppMap[deploymentId]) {
            throw new Error("Wrong appId");
        }
        const deployment = this.deployments[deploymentId];
        delete this.deploymentKeyToDeploymentMap[deployment.key];
        delete this.deployments[deploymentId];
        delete this.deploymentToAppMap[deploymentId];
        const appDeployments = this.appToDeploymentsMap[appId];
        appDeployments.splice(appDeployments.indexOf(deploymentId), 1);
        this.saveStateAsync();
        return q(null);
    }
    updateDeployment(accountId, appId, deployment) {
        deployment = clone(deployment); // pass by value
        if (!this.accounts[accountId] || !this.apps[appId] || !this.deployments[deployment.id]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        delete deployment.package; // No-op if a package update is attempted through this method
        merge(this.deployments[deployment.id], deployment);
        this.saveStateAsync();
        return q(null);
    }
    commitPackage(accountId, appId, deploymentId, appPackage) {
        appPackage = clone(appPackage); // pass by value
        if (!appPackage)
            throw new Error("No package specified");
        if (!this.accounts[accountId] || !this.apps[appId] || !this.deployments[deploymentId]) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        const deployment = this.deployments[deploymentId];
        deployment.package = appPackage;
        const history = deployment.packageHistory;
        // Unset rollout value for last package for rollback.
        const lastPackage = history.length ? history[history.length - 1] : null;
        if (lastPackage) {
            lastPackage.rollout = null;
        }
        deployment.packageHistory.push(appPackage);
        appPackage.label = "v" + deployment.packageHistory.length;
        appPackage.releasedBy = this.accounts[accountId].email;
        this.saveStateAsync();
        return q(clone(appPackage));
    }
    clearPackageHistory(accountId, appId, deploymentId) {
        const deployment = this.deployments[deploymentId];
        if (!deployment) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        delete deployment.package;
        deployment.packageHistory = [];
        this.saveStateAsync();
        return q(null);
    }
    getPackageHistory(accountId, appId, deploymentId) {
        const deployment = this.deployments[deploymentId];
        if (!deployment) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q(clone(deployment.packageHistory));
    }
    updatePackageHistory(accountId, appId, deploymentId, history) {
        if (!history || !history.length) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.Invalid, "Cannot clear package history from an update operation");
        }
        const deployment = this.deployments[deploymentId];
        if (!deployment) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        deployment.package = history[history.length - 1];
        deployment.packageHistory = history;
        this.saveStateAsync();
        return q(null);
    }
    //@ts-ignore
    async addBlob(blobId, stream, streamLength) {
        const file = this.googleBucket.file(blobId);
        const blobStream = file.createWriteStream({
            resumable: false, // You can set this to true for larger files or streaming uploads
            contentType: "application/octet-stream", // Adjust this based on your file's MIME type
            metadata: {
                contentLength: streamLength,
            },
        });
        return Promise((resolve, reject) => {
            //   stream
            //     .pipe(blobStream)
            //     .on("finish", () => {
            //       const publicUrl = `https://storage.cloud.google.com/ct-code-push/${blobId}`;
            //       this.blobs[blobId] = publicUrl;
            //       return this.saveStateAsync().then(() => blobId);
            //     })
            //     .on("error", (err) => {
            //       reject(err); // Reject on error
            //     });
            // });
            let uploadedLength = 0;
            stream.on('data', (chunk) => {
                uploadedLength += chunk.length;
                const percentageUploaded = Math.round((uploadedLength / streamLength) * 100);
                console.log(`Upload progress: ${percentageUploaded}%`);
            });
            stream
                .pipe(blobStream)
                .on('finish', () => {
                const publicUrl = `https://ui2.cltpstatic.com/ct-code-push/${blobId}`;
                this.blobs[blobId] = publicUrl;
                // Save the state after the file is uploaded successfully
                this.saveStateAsync().then(() => {
                    resolve(blobId); // Resolve with blobId on success
                }).catch((err) => {
                    reject(err); // Reject if saveStateAsync fails
                });
            })
                .on('error', (err) => {
                reject(err); // Reject on error
            });
        });
    }
    getBlobUrl(blobId) {
        return q.Promise((resolve, reject) => {
            const blobPath = this.blobs[blobId];
            if (blobPath) {
                resolve(blobPath);
            }
            else {
                reject(new Error("Blob not found"));
            }
        });
    }
    removeBlob(blobId) {
        const file = this.googleBucket.file(blobId);
        return q.Promise((resolve, reject) => {
            file.delete()
                .then(() => {
                delete this.blobs[blobId];
                this.saveStateAsync()
                    .then(() => resolve())
                    .catch(reject);
            })
                .catch(reject);
        })
            .then(() => {
            delete this.blobs[blobId];
            this.saveStateAsync();
            return q(null);
        });
    }
    addAccessKey(accountId, accessKey) {
        accessKey = clone(accessKey); // pass by value
        const account = this.accounts[accountId];
        if (!account) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        accessKey.id = this.newId();
        let accountAccessKeys = this.accountToAccessKeysMap[accountId];
        if (!accountAccessKeys) {
            accountAccessKeys = this.accountToAccessKeysMap[accountId] = [];
        }
        else if (accountAccessKeys.indexOf(accessKey.id) !== -1) {
            return q("");
        }
        accountAccessKeys.push(accessKey.id);
        this.accessKeyToAccountMap[accessKey.id] = accountId;
        this.accessKeys[accessKey.id] = accessKey;
        this.accessKeyNameToAccountIdMap[accessKey.name] = { accountId, expires: accessKey.expires };
        this.saveStateAsync();
        return q(accessKey.id);
    }
    getAccessKey(accountId, accessKeyId) {
        const expectedAccountId = this.accessKeyToAccountMap[accessKeyId];
        if (!expectedAccountId || expectedAccountId !== accountId) {
            return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
        }
        return q(clone(this.accessKeys[accessKeyId]));
    }
    getAccessKeys(accountId) {
        const accessKeyIds = this.accountToAccessKeysMap[accountId];
        if (accessKeyIds) {
            const accessKeys = accessKeyIds.map((id) => {
                return this.accessKeys[id];
            });
            return q(clone(accessKeys));
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    removeAccessKey(accountId, accessKeyId) {
        const expectedAccountId = this.accessKeyToAccountMap[accessKeyId];
        if (expectedAccountId && expectedAccountId === accountId) {
            const accessKey = this.accessKeys[accessKeyId];
            delete this.accessKeyNameToAccountIdMap[accessKey.name];
            delete this.accessKeys[accessKeyId];
            delete this.accessKeyToAccountMap[accessKeyId];
            const accessKeyIds = this.accountToAccessKeysMap[accountId];
            const index = accessKeyIds.indexOf(accessKeyId);
            if (index >= 0) {
                accessKeyIds.splice(index, /*deleteCount*/ 1);
            }
            this.saveStateAsync();
            return q(null);
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    updateAccessKey(accountId, accessKey) {
        accessKey = clone(accessKey); // pass by value
        if (accessKey && accessKey.id) {
            const expectedAccountId = this.accessKeyToAccountMap[accessKey.id];
            if (expectedAccountId && expectedAccountId === accountId) {
                merge(this.accessKeys[accessKey.id], accessKey);
                this.accessKeyNameToAccountIdMap[accessKey.name].expires = accessKey.expires;
                this.saveStateAsync();
                return q(null);
            }
        }
        return RedisS3Storage.getRejectedPromise(storage.ErrorCode.NotFound);
    }
    dropAll() {
        if (this._blobServerPromise) {
            return this._blobServerPromise.then((server) => {
                const deferred = q.defer();
                server.close((err) => {
                    if (err) {
                        deferred.reject(err);
                    }
                    else {
                        deferred.resolve();
                    }
                });
                return deferred.promise;
            });
        }
        return q(null);
    }
    addIsCurrentAccountProperty(app, accountId) {
        if (app && app.collaborators) {
            Object.keys(app.collaborators).forEach((email) => {
                if (app.collaborators[email].accountId === accountId) {
                    app.collaborators[email].isCurrentAccount = true;
                }
            });
        }
    }
    removeIsCurrentAccountProperty(app) {
        if (app && app.collaborators) {
            Object.keys(app.collaborators).forEach((email) => {
                if (app.collaborators[email].isCurrentAccount) {
                    delete app.collaborators[email].isCurrentAccount;
                }
            });
        }
    }
    isOwner(list, email) {
        return list && list[email] && list[email].permission === storage.Permissions.Owner;
    }
    isCollaborator(list, email) {
        return list && list[email] && list[email].permission === storage.Permissions.Collaborator;
    }
    isAccountIdCollaborator(list, accountId) {
        const keys = Object.keys(list);
        for (let i = 0; i < keys.length; i++) {
            if (list[keys[i]].accountId === accountId) {
                return true;
            }
        }
        return false;
    }
    removeAppPointer(accountId, appId) {
        const accountApps = this.accountToAppsMap[accountId];
        const index = accountApps.indexOf(appId);
        if (index > -1) {
            accountApps.splice(index, 1);
        }
    }
    addAppPointer(accountId, appId) {
        const accountApps = this.accountToAppsMap[accountId];
        if (accountApps.indexOf(appId) === -1) {
            accountApps.push(appId);
        }
    }
    getBlobServer() {
        if (!this._blobServerPromise) {
            const app = express();
            app.get("/:blobId", (req, res, next) => {
                const blobId = req.params.blobId;
                if (this.blobs[blobId]) {
                    res.send(this.blobs[blobId]);
                }
                else {
                    res.sendStatus(404);
                }
            });
            const deferred = q.defer();
            const server = app.listen(0, () => {
                deferred.resolve(server);
            });
            this._blobServerPromise = deferred.promise;
        }
        return this._blobServerPromise;
    }
    newId() {
        const id = "id_" + RedisS3Storage.NextIdNumber;
        RedisS3Storage.NextIdNumber += 1;
        return id;
    }
    static getRejectedPromise(errorCode, message) {
        return q.reject(storage.storageError(errorCode, message));
    }
}
exports.RedisS3Storage = RedisS3Storage;
