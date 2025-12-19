import { Audio, AVPlaybackStatus } from "expo-av";
import * as Device from "expo-device";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { getBaseURL } from "../https";
import type { Track } from "../models";
import { socketService } from "../services/socket";
import { addToHistory, getLatestHistory } from "../services/user";
import { useAuth } from "./AuthContext";
import { useSync } from "./SyncContext";

export enum PlayMode {
  SEQUENCE = "SEQUENCE",
  LOOP_LIST = "LOOP_LIST",
  SHUFFLE = "SHUFFLE",
  LOOP_SINGLE = "LOOP_SINGLE",
  SINGLE_ONCE = "SINGLE_ONCE",
}

interface PlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number;
  duration: number;
  playTrack: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  trackList: Track[];
  playTrackList: (tracks: Track[], index: number) => Promise<void>;
  playMode: PlayMode;
  togglePlayMode: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  isSynced: boolean;
  sessionId: string | null;
  handleDisconnect: () => void;
  showPlaylist: boolean;
  setShowPlaylist: (show: boolean) => void;
}

const PlayerContext = createContext<PlayerContextType>({
  isPlaying: false,
  currentTrack: null,
  position: 0,
  duration: 0,
  playTrack: async () => {},
  pause: async () => {},
  resume: async () => {},
  seekTo: async () => {},
  trackList: [],
  playTrackList: async () => {},
  playMode: PlayMode.SEQUENCE,
  togglePlayMode: () => {},
  playNext: async () => {},
  playPrevious: async () => {},
  isSynced: false,
  sessionId: null,
  handleDisconnect: () => {},
  showPlaylist: false,
  setShowPlaylist: () => {},
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackList, setTrackList] = useState<Track[]>([]);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.SEQUENCE);
  const [showPlaylist, setShowPlaylist] = useState(false);

  // Refs for accessing latest state in callbacks
  const playModeRef = React.useRef(playMode);
  const trackListRef = React.useRef(trackList);
  const currentTrackRef = React.useRef(currentTrack);

  useEffect(() => {
    playModeRef.current = playMode;
  }, [playMode]);

  useEffect(() => {
    trackListRef.current = trackList;
  }, [trackList]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const getNextIndex = (
    currentIndex: number,
    mode: PlayMode,
    list: Track[]
  ) => {
    if (list.length === 0) return -1;
    switch (mode) {
      case PlayMode.SEQUENCE:
        return currentIndex + 1 < list.length ? currentIndex + 1 : -1;
      case PlayMode.LOOP_LIST:
        return (currentIndex + 1) % list.length;
      case PlayMode.SHUFFLE:
        return Math.floor(Math.random() * list.length);
      case PlayMode.LOOP_SINGLE:
        return currentIndex;
      case PlayMode.SINGLE_ONCE:
        return -1;
      default:
        return currentIndex + 1 < list.length ? currentIndex + 1 : -1;
    }
  };

  const getPreviousIndex = (
    currentIndex: number,
    mode: PlayMode,
    list: Track[]
  ) => {
    if (list.length === 0) return -1;
    // For simplicity, previous just goes back in list order, or loops if in list loop.
    // Shuffle typically uses a history stack, but simple previous in list is often acceptable fallback.
    if (currentIndex > 0) return currentIndex - 1;
    return list.length - 1; // Wrap to end
  };

  const playNext = async () => {
    const list = trackListRef.current;
    const current = currentTrackRef.current;
    if (!current || list.length === 0) return;

    const currentIndex = list.findIndex((t) => t.id === current.id);
    if (currentIndex === -1) return;

    const nextIndex = getNextIndex(currentIndex, playModeRef.current, list);
    if (nextIndex !== -1) {
      await playTrack(list[nextIndex]);
    } else {
      // Stop playback
      if (sound) await sound.stopAsync();
    }
  };

  const playPrevious = async () => {
    const list = trackListRef.current;
    const current = currentTrackRef.current;
    if (!current || list.length === 0) return;

    const currentIndex = list.findIndex((t) => t.id === current.id);
    if (currentIndex === -1) return;

    const prevIndex = getPreviousIndex(currentIndex, playModeRef.current, list);
    if (prevIndex !== -1) {
      await playTrack(list[prevIndex]);
    }
  };

  const togglePlayMode = () => {
    const modes = Object.values(PlayMode);
    const currentIndex = modes.indexOf(playMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setPlayMode(nextMode);
  };

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        playNext();
      }
    }
  };

  const playTrack = async (track: Track, initialPosition?: number) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }
      if (!track) return;

      const uri = track.path.startsWith("http")
        ? track.path
        : `${getBaseURL()}${track.path}`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrack(track);
      if (initialPosition) {
        await newSound.setPositionAsync(initialPosition * 1000);
      }
    } catch (error) {
      console.error("Failed to play track:", error);
    }
  };

  const playTrackList = async (tracks: Track[], index: number) => {
    setTrackList(tracks);
    if (tracks[index]) {
      await playTrack(tracks[index]);
    }
  };

  const broadcastSync = (type: string, data?: any) => {
    if (isSynced && sessionId && !isProcessingSync.current) {
      socketService.emit('sync_command', {
        sessionId,
        type,
        data
      });
    }
  };

  const pause = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.isPlaying) {
          await sound.pauseAsync();
        }
      } catch (error) {
        console.error("Failed to pause:", error);
      }
    }
  };

  const resume = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.playAsync();
        }
      } catch (error) {
        console.error("Failed to resume:", error);
      }
    }
  };

  const seekTo = async (pos: number) => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.setPositionAsync(pos * 1000);
          broadcastSync('seek', pos);
        }
      } catch (error) {
        console.error("Failed to seek:", error);
      }
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "结束同步播放",
      "确定要断开连接吗？",
      [
        {
          text: "取消",
          style: "cancel"
        },
        {
          text: "确定",
          onPress: () => {
            console.log("User confirmed disconnect", sessionId);
            if (sessionId) {
              socketService.emit('player_left', { sessionId });
              setSynced(false, null);
              setParticipants([]);
            }
          }
        }
      ]
    );
  };

  const recordHistory = async () => {
    if (currentTrack && user) {
      const deviceName = Device.modelName || "Mobile Device";
      await addToHistory(currentTrack.id, user.id, position, deviceName, isSynced);
    }
  };

  const isProcessingSync = useRef(false);
  const { isSynced, sessionId, setSynced, setParticipants, lastAcceptedInvite } = useSync();

  // Sync Event Handlers - only active when synced
  useEffect(() => {
    if (isSynced && sessionId) {
        const handleSyncEvent = (payload: { type: string; data: any; fromUserId: number }) => {
          if (payload.fromUserId === user?.id) return;
          
          isProcessingSync.current = true;
          
          switch (payload.type) {
            case 'play':
              resume();
              break;
            case 'pause':
              pause();
              break;
            case 'seek':
              seekTo(payload.data);
              break;
            case 'track_change':
              playTrack(payload.data);
              break;
            case 'playlist':
              setTrackList(payload.data);
              break;
            case 'leave':
            console.log("Participant left the session");
            Alert.alert("同步状态", "对方已断开同步连接");
            break;
        }

        setTimeout(() => {
          isProcessingSync.current = false;
        }, 100);
      };

      const handleRequestInitialState = (payload: { sessionId: string; fromSocketId: string }) => {
        if (currentTrack) {
          socketService.emit('sync_command', {
            sessionId: payload.sessionId,
            type: 'track_change',
            data: currentTrack,
            targetSocketId: payload.fromSocketId
          });
          
          setTimeout(() => {
            socketService.emit('sync_command', {
              sessionId: payload.sessionId,
              type: isPlaying ? 'play' : 'pause',
              data: position,
              targetSocketId: payload.fromSocketId
            });
          }, 200);
        }
      };

      socketService.on('sync_event', handleSyncEvent);
      socketService.on('request_initial_state', handleRequestInitialState);

      return () => {
        socketService.off('sync_event', handleSyncEvent);
        socketService.off('request_initial_state', handleRequestInitialState);
      };
    }
  }, [isSynced, sessionId, currentTrack, isPlaying, position]);

  // Handle initial playback when session starts (for invited users)
  useEffect(() => {
    if (isSynced && lastAcceptedInvite && !currentTrack) {
      console.log("Applying invite context: playlist and track");
      if (lastAcceptedInvite.playlist) {
        setTrackList(lastAcceptedInvite.playlist);
      }
      if (lastAcceptedInvite.currentTrack) {
        playTrack(lastAcceptedInvite.currentTrack, lastAcceptedInvite.progress);
      }
    }
  }, [isSynced, lastAcceptedInvite]);

  // Global session event handlers - always active
  useEffect(() => {
    const handleSessionEnded = () => {
      Alert.alert("同步状态", "同步播放已结束");
      setSynced(false, null);
      setParticipants([]);
      console.log("Sync session ended");
    };

    const handlePlayerLeft = (payload: { username: string; deviceName: string }) => {
      Alert.alert("同步状态", `${payload.username} (${payload.deviceName}) 已断开同步连接`);
    };

    socketService.on('session_ended', handleSessionEnded);
    socketService.on('player_left', handlePlayerLeft);

    return () => {
      socketService.off('session_ended', handleSessionEnded);
      socketService.off('player_left', handlePlayerLeft);
    };
  }, [setSynced, setParticipants]);

  // Broadcast local changes
  useEffect(() => {
    if (isSynced && sessionId && !isProcessingSync.current) {
        socketService.emit('sync_command', {
          sessionId,
          type: isPlaying ? 'play' : 'pause',
          data: null
        });
    }
  }, [isPlaying, isSynced, sessionId]);

  useEffect(() => {
    if (isSynced && sessionId && !isProcessingSync.current && currentTrack) {
      socketService.emit('sync_command', {
        sessionId,
        type: 'track_change',
        data: currentTrack
      });
    }
  }, [currentTrack?.id, isSynced, sessionId]);

  useEffect(() => {
    if (isSynced && sessionId && !isProcessingSync.current && trackList.length > 0) {
      socketService.emit('sync_command', {
        sessionId,
        type: 'playlist',
        data: trackList
      });
    }
  }, [trackList, isSynced, sessionId]);

  // History Recording
  useEffect(() => {
    if (currentTrack) {
        recordHistory();
    }
  }, [currentTrack?.id]);

  useEffect(() => {
    if (!isPlaying && isLoaded) {
        recordHistory();
    }
  }, [isPlaying]);

  // Check Resume on mount
  useEffect(() => {
    if (user) {
        const checkResume = async () => {
            try {
                const res = await getLatestHistory(user.id);
                if (res.code === 200 && res.data) {
                    const history = res.data;
                    const deviceName = Device.modelName || "Mobile Device";
                    
                    const diff = new Date().getTime() - new Date(history.listenedAt).getTime();
                    const isRecent = diff < 24 * 60 * 60 * 1000;
                    const isOtherDevice = history.deviceName !== deviceName;

                    if (isRecent && isOtherDevice && history.track) {
                        Alert.alert(
                            "继续播放",
                            `发现在设备 ${history.deviceName} 上的播放记录，是否从 ${Math.floor(history.progress / 60)}:${Math.floor(history.progress % 60).toString().padStart(2, '0')} 继续播放 ${history.track.name}?`,
                            [
                                { text: "取消", style: "cancel" },
                                { text: "确定", onPress: () => playTrack(history.track, history.progress) }
                            ]
                        );
                    }
                }
            } catch (e) {
                console.error("Check resume error", e);
            }
        };
        checkResume();
    }
  }, [user?.id]);

  const isLoaded = !!sound;

  return (
    <PlayerContext.Provider
      value={{
        isPlaying,
        currentTrack,
        position,
        duration,
        playTrack,
        pause,
        resume,
        seekTo,
        trackList,
        playTrackList,
        playMode,
        togglePlayMode,
        playNext,
        playPrevious,
        isSynced,
        sessionId,
        handleDisconnect,
        showPlaylist,
        setShowPlaylist,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
