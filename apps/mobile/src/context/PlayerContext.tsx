import { Audio, AVPlaybackStatus } from "expo-av";
import React, { createContext, useContext, useEffect, useState } from "react";
import { getBaseURL } from "../https";

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  lyrics?: string | null;
  type?: string;
  progress?: number;
}

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
});

export const usePlayer = () => useContext(PlayerContext);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [trackList, setTrackList] = useState<Track[]>([]);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.SEQUENCE);

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

  const playTrack = async (track: Track) => {
    try {
      if (sound) {
        await sound.unloadAsync();
      }

      const uri = track.url.startsWith("http")
        ? track.url
        : `${getBaseURL()}${track.url}`;

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setCurrentTrack(track);
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

  const pause = async () => {
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const resume = async () => {
    if (sound) {
      await sound.playAsync();
    }
  };

  const seekTo = async (pos: number) => {
    if (sound) {
      await sound.setPositionAsync(pos * 1000);
    }
  };

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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
