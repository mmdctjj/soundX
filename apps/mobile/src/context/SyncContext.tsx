import React, { createContext, useContext, useEffect, useState } from 'react';
import { Track } from '../models';
import { socketService } from '../services/socket';
import { useAuth } from './AuthContext';

interface Participant {
  userId: number;
  username: string;
  deviceName: string;
  socketId: string;
}

interface SyncInvite {
  fromUserId: number;
  fromUsername: string;
  fromDeviceName: string;
  fromSocketId: string;
  sessionId: string;
  currentTrack?: Track;
  playlist?: Track[];
  progress?: number;
  timestamp: Date;
}

interface SyncContextType {
  isSynced: boolean;
  sessionId: string | null;
  participants: Participant[];
  invites: SyncInvite[];
  lastAcceptedInvite: SyncInvite | null;
  setSynced: (synced: boolean, sessionId: string | null) => void;
  setParticipants: (participants: Participant[]) => void;
  removeInvite: (sessionId: string) => void;
  acceptInvite: (invite: SyncInvite) => void;
  rejectInvite: (invite: SyncInvite) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [isSynced, setIsSynced] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [invites, setInvites] = useState<SyncInvite[]>([]);
  const [lastAcceptedInvite, setLastAcceptedInvite] = useState<SyncInvite | null>(null);

  useEffect(() => {
    if (user && token) {
      socketService.connectWithContext(user.id, token);

      const handleInviteReceived = (payload: SyncInvite) => {
        setInvites(prev => [...prev, payload]);
      };

      const handleParticipantsUpdate = (payload: { participants: Participant[] }) => {
        setParticipants(payload.participants);
      };

      const handleSessionStarted = (payload: { sessionId: string }) => {
        console.log("Session started:", payload.sessionId);
        setIsSynced(true);
        setSessionId(payload.sessionId);
      };

      const handleInviteHandled = (payload: { fromUserId: number }) => {
          // If another device handled this invite, remove it locally
          setInvites(prev => prev.filter(i => i.fromUserId !== payload.fromUserId));
      };

      socketService.on('invite_received', handleInviteReceived);
      socketService.on('participants_update', handleParticipantsUpdate);
      socketService.on('sync_session_started', handleSessionStarted);
      socketService.on('invite_handled', handleInviteHandled);

      return () => {
        socketService.off('invite_received', handleInviteReceived);
        socketService.off('participants_update', handleParticipantsUpdate);
        socketService.off('sync_session_started', handleSessionStarted);
        socketService.off('invite_handled', handleInviteHandled);
      };
    } else {
      socketService.disconnect();
    }
  }, [user, token]);

  const setSynced = (synced: boolean, sid: string | null) => {
    setIsSynced(synced);
    setSessionId(sid);
  };

  const removeInvite = (sid: string) => {
    setInvites(prev => prev.filter(i => i.sessionId !== sid));
  };

  const acceptInvite = (invite: SyncInvite) => {
    socketService.emit('respond_invite', {
        fromUserId: invite.fromUserId,
        fromSocketId: invite.fromSocketId,
        sessionId: invite.sessionId,
        accept: true
    });
    setLastAcceptedInvite(invite);
    setSynced(true, invite.sessionId);
  };

  const rejectInvite = (invite: SyncInvite) => {
    socketService.emit('respond_invite', {
        fromUserId: invite.fromUserId,
        fromSocketId: invite.fromSocketId,
        sessionId: invite.sessionId,
        accept: false
    });
    removeInvite(invite.sessionId);
  };

  return (
    <SyncContext.Provider value={{ 
        isSynced, 
        sessionId, 
        participants, 
        invites, 
        lastAcceptedInvite,
        setSynced, 
        setParticipants, 
        removeInvite,
        acceptInvite,
        rejectInvite
    }}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
