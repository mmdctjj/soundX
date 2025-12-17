import { create } from "zustand";

export interface SyncState {
  isSynced: boolean;
  sessionId: string | null;
  connectedUsers: number[];
  invitations: any[];
  
  setSynced: (synced: boolean, sessionId?: string | null) => void;
  setConnectedUsers: (users: number[]) => void;
  addInvitation: (invite: any) => void;
  removeInvitation: (fromUserId: number) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isSynced: false,
  sessionId: null,
  connectedUsers: [],
  invitations: [],

  setSynced: (synced, sessionId = null) => set({ isSynced: synced, sessionId }),
  setConnectedUsers: (users) => set({ connectedUsers: users }),
  addInvitation: (invite) => set((state) => ({ 
      invitations: [...state.invitations, invite] 
  })),
  removeInvitation: (fromUserId) => set((state) => ({
      invitations: state.invitations.filter(i => i.fromUserId !== fromUserId)
  })),
  reset: () => set({ isSynced: false, sessionId: null, connectedUsers: [], invitations: [] }),
}));
