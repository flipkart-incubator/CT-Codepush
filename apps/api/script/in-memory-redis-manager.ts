// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

// In-memory implementation of RedisManager for local development (no Redis required).

import * as q from "q";
import { CacheableResponse, DeploymentMetrics, DEPLOYMENT_SUCCEEDED, Utilities, IRedisManager } from "./redis-manager";

const DEFAULT_EXPIRY_MS = 3600 * 1000; // one hour

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class InMemoryRedisManager implements IRedisManager {
  private _cache: Map<string, Map<string, CacheEntry>> = new Map();
  private _metricsLabels: Map<string, Record<string, number>> = new Map();
  private _metricsClients: Map<string, Record<string, string>> = new Map();

  public get isEnabled(): boolean {
    return true;
  }

  public checkHealth(): q.Promise<void> {
    return q<void>(undefined);
  }

  private pruneExpired(key: string): void {
    const map = this._cache.get(key);
    if (!map) return;
    const now = Date.now();
    for (const [url, entry] of map.entries()) {
      if (entry.expiresAt <= now) map.delete(url);
    }
    if (map.size === 0) this._cache.delete(key);
  }

  public getCachedResponse(expiryKey: string, url: string): q.Promise<CacheableResponse> {
    this.pruneExpired(expiryKey);
    const map = this._cache.get(expiryKey);
    if (!map) return q<CacheableResponse>(null);
    const entry = map.get(url);
    if (!entry || entry.expiresAt <= Date.now()) return q<CacheableResponse>(null);
    try {
      const response = JSON.parse(entry.value) as CacheableResponse;
      return q<CacheableResponse>(response);
    } catch {
      return q<CacheableResponse>(null);
    }
  }

  public setCachedResponse(expiryKey: string, url: string, response: CacheableResponse): q.Promise<void> {
    let map = this._cache.get(expiryKey);
    if (!map) {
      map = new Map();
      this._cache.set(expiryKey, map);
    }
    map.set(url, {
      value: JSON.stringify(response),
      expiresAt: Date.now() + DEFAULT_EXPIRY_MS,
    });
    return q<void>(undefined);
  }

  public incrementLabelStatusCount(deploymentKey: string, label: string, status: string): q.Promise<void> {
    const hash = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
    const field = Utilities.getLabelStatusField(label, status);
    if (!field) return q<void>(undefined);
    let metrics = this._metricsLabels.get(hash);
    if (!metrics) {
      metrics = {};
      this._metricsLabels.set(hash, metrics);
    }
    metrics[field] = (metrics[field] || 0) + 1;
    return q<void>(undefined);
  }

  public clearMetricsForDeploymentKey(deploymentKey: string): q.Promise<void> {
    this._metricsLabels.delete(Utilities.getDeploymentKeyLabelsHash(deploymentKey));
    this._metricsClients.delete(Utilities.getDeploymentKeyClientsHash(deploymentKey));
    return q<void>(undefined);
  }

  public getMetricsWithDeploymentKey(deploymentKey: string): q.Promise<DeploymentMetrics> {
    const hash = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
    const metrics = this._metricsLabels.get(hash);
    return q<DeploymentMetrics>(metrics ? { ...metrics } : null);
  }

  public recordUpdate(
    currentDeploymentKey: string,
    currentLabel: string,
    previousDeploymentKey?: string,
    previousLabel?: string
  ): q.Promise<void> {
    const currentHash = Utilities.getDeploymentKeyLabelsHash(currentDeploymentKey);
    let current = this._metricsLabels.get(currentHash);
    if (!current) {
      current = {};
      this._metricsLabels.set(currentHash, current);
    }
    const activeField = Utilities.getLabelActiveCountField(currentLabel);
    const succeededField = Utilities.getLabelStatusField(currentLabel, DEPLOYMENT_SUCCEEDED);
    if (activeField) current[activeField] = (current[activeField] || 0) + 1;
    if (succeededField) current[succeededField] = (current[succeededField] || 0) + 1;

    if (previousDeploymentKey && previousLabel) {
      const prevHash = Utilities.getDeploymentKeyLabelsHash(previousDeploymentKey);
      let prev = this._metricsLabels.get(prevHash);
      if (!prev) {
        prev = {};
        this._metricsLabels.set(prevHash, prev);
      }
      const prevActiveField = Utilities.getLabelActiveCountField(previousLabel);
      if (prevActiveField) prev[prevActiveField] = Math.max(0, (prev[prevActiveField] || 0) - 1);
    }
    return q<void>(undefined);
  }

  public removeDeploymentKeyClientActiveLabel(deploymentKey: string, clientUniqueId: string): q.Promise<void> {
    const hash = Utilities.getDeploymentKeyClientsHash(deploymentKey);
    const clients = this._metricsClients.get(hash);
    if (clients && clients[clientUniqueId]) {
      delete clients[clientUniqueId];
    }
    return q<void>(undefined);
  }

  public invalidateCache(expiryKey: string): q.Promise<void> {
    this._cache.delete(expiryKey);
    return q<void>(undefined);
  }

  public close(): q.Promise<void> {
    this._cache.clear();
    this._metricsLabels.clear();
    this._metricsClients.clear();
    return q<void>(undefined);
  }

  public getCurrentActiveLabel(deploymentKey: string, clientUniqueId: string): q.Promise<string> {
    const hash = Utilities.getDeploymentKeyClientsHash(deploymentKey);
    const clients = this._metricsClients.get(hash);
    const label = clients ? clients[clientUniqueId] : undefined;
    return q<string>(label || null);
  }

  public updateActiveAppForClient(
    deploymentKey: string,
    clientUniqueId: string,
    toLabel: string,
    fromLabel?: string
  ): q.Promise<void> {
    const labelsHash = Utilities.getDeploymentKeyLabelsHash(deploymentKey);
    const clientsHash = Utilities.getDeploymentKeyClientsHash(deploymentKey);

    let clients = this._metricsClients.get(clientsHash);
    if (!clients) {
      clients = {};
      this._metricsClients.set(clientsHash, clients);
    }
    clients[clientUniqueId] = toLabel;

    let metrics = this._metricsLabels.get(labelsHash);
    if (!metrics) {
      metrics = {};
      this._metricsLabels.set(labelsHash, metrics);
    }
    const toField = Utilities.getLabelActiveCountField(toLabel);
    if (toField) metrics[toField] = (metrics[toField] || 0) + 1;
    if (fromLabel) {
      const fromField = Utilities.getLabelActiveCountField(fromLabel);
      if (fromField) metrics[fromField] = Math.max(0, (metrics[fromField] || 0) - 1);
    }
    return q<void>(undefined);
  }
}
