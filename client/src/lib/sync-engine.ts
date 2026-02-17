import { create } from 'zustand';

export interface SyncOperation {
  id?: string;
  table: string;
  action: 'create' | 'update' | 'delete';
  data: Record<string, any>;
  createdAt: number;
}

interface SyncPullResponse {
  eventos: Record<string, { created: any[]; updated: any[]; deleted: string[] }>;
  cursor_proximo: string | null;
  tem_mais: boolean;
  timestamp: number;
}

interface SyncPushResponse {
  applied: number;
  errors: Array<{ index: number; error: string }>;
}

interface SyncState {
  pendingChanges: SyncOperation[];
  lastCursor: string | null;
  isSyncing: boolean;
  lastError: string | null;

  pushChange: (table: string, action: 'create' | 'update' | 'delete', data: Record<string, any>, id?: string) => void;
  sync: () => Promise<SyncPushResponse | null>;
  pull: (tables?: string[]) => Promise<SyncPullResponse | null>;
  clearError: () => void;
}

export const useSyncEngine = create<SyncState>((set, get) => ({
  pendingChanges: [],
  lastCursor: null,
  isSyncing: false,
  lastError: null,

  pushChange: (table, action, data, id) => {
    const change: SyncOperation = {
      id,
      table,
      action,
      data,
      createdAt: Date.now(),
    };

    console.log(`[SyncEngine] Queued: ${action} on ${table}`, change);

    set((state) => ({
      pendingChanges: [...state.pendingChanges, change],
      lastError: null,
    }));

    get().sync();
  },

  sync: async () => {
    const { isSyncing, pendingChanges } = get();
    if (isSyncing || pendingChanges.length === 0) return null;

    set({ isSyncing: true, lastError: null });

    try {
      const response = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: pendingChanges.map((c) => ({
            id: c.id,
            table: c.table,
            action: c.action,
            data: c.data,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Sync push failed: ${response.status}`);
      }

      const result: SyncPushResponse = await response.json();

      console.log(`[SyncEngine] Push complete: ${result.applied} applied, ${result.errors.length} errors`);

      set({
        isSyncing: false,
        pendingChanges: [],
      });

      return result;
    } catch (err: any) {
      console.error('[SyncEngine] Push error:', err);
      set({ isSyncing: false, lastError: err.message });
      return null;
    }
  },

  pull: async (tables) => {
    const { isSyncing, lastCursor } = get();
    if (isSyncing) return null;

    set({ isSyncing: true, lastError: null });

    try {
      const params = new URLSearchParams();
      if (lastCursor) params.set('cursor', lastCursor);
      if (tables) params.set('tables', tables.join(','));

      const response = await fetch(`/api/sync/pull?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Sync pull failed: ${response.status}`);
      }

      const result: SyncPullResponse = await response.json();

      console.log('[SyncEngine] Pull complete:', result);

      set({
        isSyncing: false,
        lastCursor: result.cursor_proximo,
      });

      return result;
    } catch (err: any) {
      console.error('[SyncEngine] Pull error:', err);
      set({ isSyncing: false, lastError: err.message });
      return null;
    }
  },

  clearError: () => set({ lastError: null }),
}));
