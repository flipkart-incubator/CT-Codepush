"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisManager = exports.Utilities = exports.DOWNLOADED = exports.ACTIVE = exports.DEPLOYMENT_FAILED = exports.DEPLOYMENT_SUCCEEDED = void 0;
const q = require("q");
const redis = require("redis");
const util_1 = require("util");
exports.DEPLOYMENT_SUCCEEDED = "DeploymentSucceeded";
exports.DEPLOYMENT_FAILED = "DeploymentFailed";
exports.ACTIVE = "Active";
exports.DOWNLOADED = "Downloaded";
var Utilities;
(function (Utilities) {
    function isValidDeploymentStatus(status) {
        return status === exports.DEPLOYMENT_SUCCEEDED || status === exports.DEPLOYMENT_FAILED || status === exports.DOWNLOADED;
    }
    Utilities.isValidDeploymentStatus = isValidDeploymentStatus;
    function getLabelStatusField(label, status) {
        if (isValidDeploymentStatus(status)) {
            return label + ":" + status;
        }
        else {
            return null;
        }
    }
    Utilities.getLabelStatusField = getLabelStatusField;
    function getLabelActiveCountField(label) {
        if (label) {
            return label + ":" + exports.ACTIVE;
        }
        else {
            return null;
        }
    }
    Utilities.getLabelActiveCountField = getLabelActiveCountField;
    function getDeploymentKeyHash(deploymentKey) {
        return "deploymentKey:" + deploymentKey;
    }
    Utilities.getDeploymentKeyHash = getDeploymentKeyHash;
    function getDeploymentKeyLabelsHash(deploymentKey) {
        return "deploymentKeyLabels:" + deploymentKey;
    }
    Utilities.getDeploymentKeyLabelsHash = getDeploymentKeyLabelsHash;
    function getDeploymentKeyClientsHash(deploymentKey) {
        return "deploymentKeyClients:" + deploymentKey;
    }
    Utilities.getDeploymentKeyClientsHash = getDeploymentKeyClientsHash;
})(Utilities || (exports.Utilities = Utilities = {}));
// class PromisifiedRedisClient {
//   // An incomplete set of promisified versions of the original redis methods
//   public del: (...key: string[]) => Promise<number> = null;
//   public execBatch: (redisBatchClient: any) => Promise<any[]> = null;
//   public exists: (...key: string[]) => Promise<number> = null;
//   public expire: (key: string, seconds: number) => Promise<number> = null;
//   public hdel: (key: string, field: string) => Promise<number> = null;
//   public hget: (key: string, field: string) => Promise<string> = null;
//   public hgetall: (key: string) => Promise<any> = null;
//   public hincrby: (key: string, field: string, value: number) => Promise<number> = null;
//   public hset: (key: string, field: string, value: string) => Promise<number> = null;
//   public ping: (payload?: any) => Promise<any> = null;
//   public quit: () => Promise<void> = null;
//   public select: (databaseNumber: number) => Promise<void> = null;
//   public set: (key: string, value: string) => Promise<void> = null;
//   constructor(redisClient: redis.RedisClient) {
//     this.execBatch = (redisBatchClient: any) => {
//       return q.ninvoke<any[]>(redisBatchClient, "exec");
//     };
//     for (const functionName in this) {
//       if (this.hasOwnProperty(functionName) && (<any>this)[functionName] === null) {
//         const originalFunction = (<any>redisClient)[functionName];
//         assert(!!originalFunction, "Binding a function that does not exist: " + functionName);
//         (<any>this)[functionName] = q.nbind(originalFunction, redisClient);
//       }
//     }
//   }
// }
class PromisifiedRedisClient {
    // An incomplete set of promisified versions of the original redis methods
    del;
    execBatch;
    exists;
    expire;
    hdel;
    hget;
    hgetall;
    hincrby;
    hset;
    ping;
    quit;
    select;
    set;
    constructor(redisClient) {
        // Promisify the methods for this Redis client
        this.del = (0, util_1.promisify)(redisClient.del).bind(redisClient);
        this.execBatch = function execBatch(redisBatchClient) {
            return q.Promise((resolve, reject) => {
                redisBatchClient.exec((err, results) => {
                    if (err)
                        reject(err);
                    else
                        resolve(results);
                });
            });
        };
        this.exists = (0, util_1.promisify)(redisClient.exists).bind(redisClient);
        this.expire = (0, util_1.promisify)(redisClient.expire).bind(redisClient);
        this.hdel = (0, util_1.promisify)(redisClient.hdel).bind(redisClient);
        this.hget = (0, util_1.promisify)(redisClient.hget).bind(redisClient);
        this.hgetall = (0, util_1.promisify)(redisClient.hgetall).bind(redisClient);
        this.hincrby = (0, util_1.promisify)(redisClient.hincrby).bind(redisClient);
        this.hset = (0, util_1.promisify)(redisClient.hset).bind(redisClient);
        this.ping = (0, util_1.promisify)(redisClient.ping).bind(redisClient);
        this.quit = (0, util_1.promisify)(redisClient.quit).bind(redisClient);
        this.select = (0, util_1.promisify)(redisClient.select).bind(redisClient);
        this.set = (0, util_1.promisify)(redisClient.set).bind(redisClient);
    }
}
class RedisManager {
    static DEFAULT_EXPIRY = 3600; // one hour, specified in seconds
    static METRICS_DB = 1;
    _opsClient;
    _promisifiedOpsClient;
    _metricsClient;
    _promisifiedMetricsClient;
    _setupMetricsClientPromise;
    constructor() {
        if (process.env.REDIS_HOST && process.env.REDIS_PORT) {
            const redisConfig = {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT,
            };
            this._opsClient = redis.createClient(redisConfig);
            this._metricsClient = redis.createClient(redisConfig);
            this._opsClient.on('error', (err) => {
                console.error('Ops Client Redis error:', err);
            });
            this._metricsClient.on('error', (err) => {
                console.error('Metrics Client Redis error:', err);
            });
            this._promisifiedOpsClient = new PromisifiedRedisClient(this._opsClient);
            this._promisifiedMetricsClient = new PromisifiedRedisClient(this._metricsClient);
            this._setupMetricsClientPromise = this._promisifiedMetricsClient
                .select(RedisManager.METRICS_DB)
                .then(() => this._promisifiedMetricsClient.set("health", "health"));
        }
        else {
            console.warn("No REDIS_HOST or REDIS_PORT environment variable configured.");
        }
    }
    get isEnabled() {
        return !!this._opsClient && !!this._metricsClient;
    }
    checkHealth() {
        if (!this.isEnabled) {
            return q.reject("Redis manager is not enabled");
        }
        return q.all([this._promisifiedOpsClient.ping(), this._promisifiedMetricsClient.ping()]).spread(() => { });
    }
    /**
     * Get a response from cache if possible, otherwise return null.
     * @param expiryKey: An identifier to get cached response if not expired
     * @param url: The url of the request to cache
     * @return The object of type CacheableResponse
     */
    getCachedResponse(expiryKey, url) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._promisifiedOpsClient.hget(expiryKey, url).then((serializedResponse) => {
            if (serializedResponse) {
                const response = JSON.parse(serializedResponse);
                return q(response);
            }
            else {
                return q(null);
            }
        });
    }
    /**
     * Set a response in redis cache for given expiryKey and url.
     * @param expiryKey: An identifier that you can later use to expire the cached response
     * @param url: The url of the request to cache
     * @param response: The response to cache
     */
    setCachedResponse(expiryKey, url, response) {
        if (!this.isEnabled) {
            return q(null);
        }
        // Store response in cache with a timed expiry
        const serializedResponse = JSON.stringify(response);
        let isNewKey;
        return this._promisifiedOpsClient
            .exists(expiryKey)
            .then((isExisting) => {
            isNewKey = !isExisting;
            return this._promisifiedOpsClient.hset(expiryKey, url, serializedResponse);
        })
            .then(() => {
            if (isNewKey) {
                return this._promisifiedOpsClient.expire(expiryKey, RedisManager.DEFAULT_EXPIRY);
            }
        })
            .then(() => { });
    }
    // Atomically increments the status field for the deployment by 1,
    // or 1 by default. If the field does not exist, it will be created with the value of 1.
    incrementLabelStatusCount(deploymentKey, label, status) {
        if (!this.isEnabled) {
            return q(null);
        }
        const hash = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
        const field = Utilities.getLabelStatusField(label, status);
        return this._setupMetricsClientPromise.then(() => this._promisifiedMetricsClient.hincrby(hash, field, 1)).then(() => { });
    }
    clearMetricsForDeploymentKey(deploymentKey) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise
            .then(() => this._promisifiedMetricsClient.del(Utilities.getDeploymentKeyLabelsHash(deploymentKey), Utilities.getDeploymentKeyClientsHash(deploymentKey)))
            .then(() => { });
    }
    // Promised return value will look something like
    // { "v1:DeploymentSucceeded": 123, "v1:DeploymentFailed": 4, "v1:Active": 123 ... }
    getMetricsWithDeploymentKey(deploymentKey) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise
            .then(() => this._promisifiedMetricsClient.hgetall(Utilities.getDeploymentKeyLabelsHash(deploymentKey)))
            .then((metrics) => {
            console.log(metrics, 'metrics');
            // Redis returns numerical values as strings, handle parsing here.
            if (metrics) {
                Object.keys(metrics).forEach((metricField) => {
                    if (!isNaN(metrics[metricField])) {
                        metrics[metricField] = +metrics[metricField];
                    }
                });
            }
            return metrics;
        });
    }
    recordUpdate(currentDeploymentKey, currentLabel, previousDeploymentKey, previousLabel) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise
            .then(() => {
            const batchClient = this._metricsClient.batch();
            const currentDeploymentKeyLabelsHash = Utilities.getDeploymentKeyLabelsHash(currentDeploymentKey);
            const currentLabelActiveField = Utilities.getLabelActiveCountField(currentLabel);
            const currentLabelDeploymentSucceededField = Utilities.getLabelStatusField(currentLabel, exports.DEPLOYMENT_SUCCEEDED);
            batchClient.hincrby(currentDeploymentKeyLabelsHash, currentLabelActiveField, /* incrementBy */ 1);
            batchClient.hincrby(currentDeploymentKeyLabelsHash, currentLabelDeploymentSucceededField, /* incrementBy */ 1);
            if (previousDeploymentKey && previousLabel) {
                const previousDeploymentKeyLabelsHash = Utilities.getDeploymentKeyLabelsHash(previousDeploymentKey);
                const previousLabelActiveField = Utilities.getLabelActiveCountField(previousLabel);
                batchClient.hincrby(previousDeploymentKeyLabelsHash, previousLabelActiveField, /* incrementBy */ -1);
            }
            return this._promisifiedMetricsClient.execBatch(batchClient);
        })
            .then(() => { });
    }
    removeDeploymentKeyClientActiveLabel(deploymentKey, clientUniqueId) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise
            .then(() => {
            const deploymentKeyClientsHash = Utilities.getDeploymentKeyClientsHash(deploymentKey);
            return this._promisifiedMetricsClient.hdel(deploymentKeyClientsHash, clientUniqueId);
        })
            .then(() => { });
    }
    invalidateCache(expiryKey) {
        if (!this.isEnabled)
            return q(null);
        return this._promisifiedOpsClient.del(expiryKey).then(() => { });
    }
    // For unit tests only
    close() {
        const promiseChain = q(null);
        if (!this._opsClient && !this._metricsClient)
            return promiseChain;
        return promiseChain
            .then(() => this._opsClient && this._promisifiedOpsClient.quit())
            .then(() => this._metricsClient && this._promisifiedMetricsClient.quit())
            .then(() => null);
    }
    /* deprecated */
    getCurrentActiveLabel(deploymentKey, clientUniqueId) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise.then(() => this._promisifiedMetricsClient.hget(Utilities.getDeploymentKeyClientsHash(deploymentKey), clientUniqueId));
    }
    /* deprecated */
    updateActiveAppForClient(deploymentKey, clientUniqueId, toLabel, fromLabel) {
        if (!this.isEnabled) {
            return q(null);
        }
        return this._setupMetricsClientPromise
            .then(() => {
            const batchClient = this._metricsClient.batch();
            const deploymentKeyLabelsHash = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
            const deploymentKeyClientsHash = Utilities.getDeploymentKeyClientsHash(deploymentKey);
            const toLabelActiveField = Utilities.getLabelActiveCountField(toLabel);
            batchClient.hset(deploymentKeyClientsHash, clientUniqueId, toLabel);
            batchClient.hincrby(deploymentKeyLabelsHash, toLabelActiveField, /* incrementBy */ 1);
            if (fromLabel) {
                const fromLabelActiveField = Utilities.getLabelActiveCountField(fromLabel);
                batchClient.hincrby(deploymentKeyLabelsHash, fromLabelActiveField, /* incrementBy */ -1);
            }
            return this._promisifiedMetricsClient.execBatch(batchClient);
        })
            .then(() => { });
    }
}
exports.RedisManager = RedisManager;
