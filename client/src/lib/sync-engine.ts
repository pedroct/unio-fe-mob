import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

// ----------------------------------------------------------------------------
// Types & Interfaces
// Matching the proposed Schema: body_records, meal_logs, etc.
// ----------------------------------------------------------------------------

export interface SyncOperation {
  id: string; // UUID
  table: string;
  action: 'create' | 'update' | 'delete';
  data: any;
  createdAt: number;
}

interface SyncState {
  pendingChanges: SyncOperation[];
  lastPulledAt: number | null;
  isSyncing: boolean;
  
  // Actions
  pushChange: (table: string, action: 'create' | 'update' | 'delete', data: any) => void;
  sync: () => Promise<void>;
  generateUUID: () => string;
}

// ----------------------------------------------------------------------------
// Mock Sync Engine (Zustand Store)
// Simulates the WatermelonDB Sync behavior
// ----------------------------------------------------------------------------

export const useSyncEngine = create<SyncState>((set, get) => ({
  pendingChanges: [],
  lastPulledAt: null,
  isSyncing: false,

  generateUUID: () => uuidv4(),

  pushChange: (table, action, data) => {
    const change: SyncOperation = {
      id: get().generateUUID(),
      table,
      action,
      data: {
        ...data,
        _id: data.id || get().generateUUID(), // Ensure UUID
        _status: action === 'create' ? 'created' : 'updated', // WatermelonDB style
        _changed: '',
      },
      createdAt: Date.now(),
    };

    console.log(`[SyncEngine] Queued change: ${action} on ${table}`, change);

    set((state) => ({
      pendingChanges: [...state.pendingChanges, change],
    }));

    // Auto-trigger sync attempt (optimistic)
    get().sync();
  },

  sync: async () => {
    const { isSyncing, pendingChanges, lastPulledAt } = get();
    if (isSyncing || pendingChanges.length === 0) return;

    set({ isSyncing: true });

    // Simulate Network Latency
    console.log('[SyncEngine] Pushing changes to backend...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate Server Response
    console.log('[SyncEngine] Sync success! Changes committed.');
    
    set({
      isSyncing: false,
      pendingChanges: [], // Clear queue
      lastPulledAt: Date.now(),
    });
  }
}));
