import {
  clearSyncQueueItem,
  getAllAssessments,
  getDB,
  getStoredEvaluatorProfile,
  getSyncQueueItems,
  saveAssessmentLocal,
} from './storage';
import { DamageAssessment, SyncMutation } from '../types/edan';

class SyncManager {
  private eventSource: EventSource | null = null;
  private isSyncing = false;
  private onlineListeners: Array<(isOnline: boolean) => void> = [];
  private syncStatusListeners: Array<(status: 'idle' | 'syncing' | 'synced' | 'error', pendingCount: number) => void> = [];
  private reconnectTimeout: any = null;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleConnectivityChange(true));
      window.addEventListener('offline', () => this.handleConnectivityChange(false));

      // Initial check & connect
      if (navigator.onLine) {
        this.initRealtimeStream();
        setTimeout(() => this.syncPendingQueue(), 1500);
      }
    }
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  }

  public subscribeOnline(cb: (isOnline: boolean) => void) {
    this.onlineListeners.push(cb);
    return () => {
      this.onlineListeners = this.onlineListeners.filter((l) => l !== cb);
    };
  }

  public subscribeSyncStatus(cb: (status: 'idle' | 'syncing' | 'synced' | 'error', pendingCount: number) => void) {
    this.syncStatusListeners.push(cb);
    return () => {
      this.syncStatusListeners = this.syncStatusListeners.filter((l) => l !== cb);
    };
  }

  private notifyStatus(status: 'idle' | 'syncing' | 'synced' | 'error', pendingCount: number) {
    this.syncStatusListeners.forEach((cb) => cb(status, pendingCount));
  }

  private handleConnectivityChange(isOnline: boolean) {
    this.onlineListeners.forEach((cb) => cb(isOnline));
    if (isOnline) {
      this.initRealtimeStream();
      this.syncPendingQueue();
    } else {
      if (this.eventSource) {
        this.eventSource.close();
        this.eventSource = null;
      }
      this.updatePendingCount();
    }
  }

  public async updatePendingCount(): Promise<number> {
    try {
      const items = await getSyncQueueItems();
      this.notifyStatus('idle', items.length);
      return items.length;
    } catch {
      return 0;
    }
  }

  /**
   * Connect to Server-Sent Events (SSE) for instant multi-user real-time updates
   */
  public initRealtimeStream() {
    if (this.eventSource || !navigator.onLine) return;

    try {
      this.eventSource = new EventSource('/api/events');

      this.eventSource.addEventListener('ASSESSMENT_SAVED', async (event: MessageEvent) => {
        try {
          const item: DamageAssessment = JSON.parse(event.data);
          const db = await getDB();
          await db.put('assessments', item);
          window.dispatchEvent(new CustomEvent('edan-assessments-changed', { detail: item }));
        } catch (err) {
          console.warn('[SSE Parse Error]', err);
        }
      });

      this.eventSource.addEventListener('ASSESSMENT_DELETED', async (event: MessageEvent) => {
        try {
          const { id } = JSON.parse(event.data);
          const db = await getDB();
          await db.delete('assessments', id);
          window.dispatchEvent(new CustomEvent('edan-assessments-changed', { detail: { id, deleted: true } }));
        } catch (err) {
          console.warn('[SSE Delete Parse Error]', err);
        }
      });

      this.eventSource.addEventListener('EVALUATOR_PRESENCE', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          window.dispatchEvent(new CustomEvent('edan-presence-updated', { detail: data }));
        } catch {
          // ignore
        }
      });

      this.eventSource.addEventListener('CONTINGENCY_UPDATED', async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          const db = await getDB();
          await db.put('contingencies', data);
          window.dispatchEvent(new CustomEvent('edan-contingency-changed', { detail: data }));
        } catch (err) {
          console.warn('[SSE Contingency Parse Error]', err);
        }
      });

      this.eventSource.onerror = () => {
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // retry in 5s
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          if (navigator.onLine) this.initRealtimeStream();
        }, 5000);
      };
    } catch (e) {
      console.warn('[SSE Connect Error]', e);
    }
  }

  /**
   * Sincronizar cola de cambios pendientes y traer cambios remotos
   */
  public async syncPendingQueue(): Promise<{ syncedCount: number; errors: number }> {
    if (this.isSyncing || !navigator.onLine) {
      return { syncedCount: 0, errors: 0 };
    }

    this.isSyncing = true;
    const queue = await getSyncQueueItems();
    this.notifyStatus('syncing', queue.length);

    let syncedCount = 0;
    let errors = 0;

    try {
      // 1. Post batch mutations to /api/sync
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mutations: queue,
          lastSyncTimestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync HTTP ${response.status}`);
      }

      const result = await response.json();

      // 2. Clear sent queue items
      for (const item of queue) {
        await clearSyncQueueItem(item.id);
        syncedCount++;
      }

      // 3. Update local IndexedDB with latest server dataset
      if (result.assessments && Array.isArray(result.assessments)) {
        const db = await getDB();
        const tx = db.transaction('assessments', 'readwrite');
        for (const item of result.assessments) {
          await tx.store.put({ ...item, syncStatus: 'synced' });
        }
        await tx.done;
      }

      this.notifyStatus('synced', 0);
      window.dispatchEvent(new CustomEvent('edan-assessments-changed'));
    } catch (err) {
      console.error('[Sync Error]', err);
      errors = queue.length;
      this.notifyStatus('error', queue.length);
    } finally {
      this.isSyncing = false;
    }

    return { syncedCount, errors };
  }

  /**
   * Send single assessment to server if online
   */
  public async sendAssessmentToServer(assessment: DamageAssessment): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assessment),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Delete single assessment from server permanently if online
   */
  public async deleteAssessmentFromServer(id: string): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      const res = await fetch(`/api/assessments/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Broadcast presence & coordinates
   */
  public async pingPresence(coords?: { lat: number; lng: number }) {
    if (!navigator.onLine) return;
    try {
      const profile = await getStoredEvaluatorProfile();
      await fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorId: profile.id,
          name: profile.name,
          callsign: profile.radioCallsign,
          role: profile.role,
          lat: coords?.lat,
          lng: coords?.lng,
        }),
      });
    } catch {
      // ignore
    }
  }
}

export const syncService = new SyncManager();
