import { create } from "zustand";

export interface SyncState {
  isSynced: boolean;
  sessionId: string | null;
  connectedUsers: number[];
  invitations: any[];
  
  participants: { userId: number; username: string; deviceName: string; socketId: string }[];
  setParticipants: (users: { userId: number; username: string; deviceName: string; socketId: string }[]) => void;

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
  participants: [],

  setSynced: (synced, sessionId = null) => set({ isSynced: synced, sessionId }),
  setConnectedUsers: (users) => set({ connectedUsers: users }),
  setParticipants: (participants) => set({ participants }),
  addInvitation: (invite) => set((state) => ({ 
      invitations: [...state.invitations, invite] 
  })),
  removeInvitation: (fromUserId) => set((state) => ({
      invitations: state.invitations.filter(i => i.fromUserId !== fromUserId)
  })),
  reset: () => set({ isSynced: false, sessionId: null, connectedUsers: [], invitations: [], participants: [] }),
}));
