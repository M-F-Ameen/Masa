'use client';

import { useEffect, useCallback, useState, useSyncExternalStore } from 'react';
import { PosOfflineQueue, QueuedPosSale } from '../../../infrastructure/pos/pos-offline-queue';
import { createPosOrderAction } from '../../actions/pos.actions';

const EMPTY_QUEUE: QueuedPosSale[] = [];

function subscribeOnline(callback: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
    ? navigator.onLine
    : true;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

let cachedQueue: QueuedPosSale[] = PosOfflineQueue.getQueuedSales();
const queueSubscribers = new Set<() => void>();

function refreshQueueSnapshot(): void {
  cachedQueue = PosOfflineQueue.getQueuedSales();
  queueSubscribers.forEach((listener) => listener());
}

function subscribeQueue(callback: () => void): () => void {
  queueSubscribers.add(callback);
  return () => {
    queueSubscribers.delete(callback);
  };
}

function getQueueSnapshot(): QueuedPosSale[] {
  return cachedQueue;
}

function getQueueServerSnapshot(): QueuedPosSale[] {
  return EMPTY_QUEUE;
}

export function usePosOfflineSync() {
  const isOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );
  const queuedSales = useSyncExternalStore(
    subscribeQueue,
    getQueueSnapshot,
    getQueueServerSnapshot
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
    timestamp: number;
  } | null>(null);

  // Process offline mutation sync queue
  const syncQueue = useCallback(async (): Promise<{ synced: number; failed: number }> => {
    if (!getOnlineSnapshot()) {
      return { synced: 0, failed: 0 };
    }

    const currentQueue = PosOfflineQueue.getQueuedSales();
    if (currentQueue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    setIsSyncing(true);
    let synced = 0;
    let failed = 0;

    for (const item of currentQueue) {
      try {
        PosOfflineQueue.updateSaleStatus(item.id, 'SYNCING');
        const result = await createPosOrderAction(item.request);
        if (result.success) {
          PosOfflineQueue.removeQueuedSale(item.id);
          synced++;
        } else {
          // If already exists or completed, consider synced (idempotent recovery)
          if (result.code === 'DUPLICATE_ORDER' || result.error?.includes('مكرر')) {
            PosOfflineQueue.removeQueuedSale(item.id);
            synced++;
          } else {
            PosOfflineQueue.updateSaleStatus(item.id, 'FAILED', result.error);
            failed++;
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Network error during sync';
        PosOfflineQueue.updateSaleStatus(item.id, 'FAILED', errorMsg);
        failed++;
      }
    }

    refreshQueueSnapshot();
    setIsSyncing(false);
    setLastSyncResult({ synced, failed, timestamp: Date.now() });

    return { synced, failed };
  }, []);

  // Setup online event listeners and periodic sync while there are pending sales
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      syncQueue();
    };

    window.addEventListener('online', handleOnline);

    const interval = setInterval(() => {
      if (getOnlineSnapshot() && PosOfflineQueue.getQueuedSales().length > 0) {
        syncQueue();
      }
    }, 45000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [syncQueue]);

  return {
    isOnline,
    isSyncing,
    pendingCount: queuedSales.length,
    queuedSales,
    refreshQueue: refreshQueueSnapshot,
    syncNow: syncQueue,
    lastSyncResult,
  };
}