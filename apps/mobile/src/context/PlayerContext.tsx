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

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setPosition(status.positionMillis / 1000);
      setDuration(status.durationMillis ? status.durationMillis / 1000 : 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};
