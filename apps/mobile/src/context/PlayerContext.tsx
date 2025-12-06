import React, { createContext, useContext, useEffect, useState } from "react";
import TrackPlayer, {
  State,
  Track,
  usePlaybackState,
  useProgress,
} from "react-native-track-player";

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
  const playbackState = usePlaybackState();
  const { position, duration } = useProgress();
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  useEffect(() => {
    async function init() {
      // const isSetup = await setupPlayer();
      // setIsPlayerReady(isSetup);
      setIsPlayerReady(false); // Disable for now
    }
    init();
  }, []);

  // useEffect(() => {
  //   // Listen for track changes
  //   const listener = TrackPlayer.addEventListener(
  //     TrackPlayerEvent.PlaybackTrackChanged,
  //     async (event: any) => {
  //       if (event.nextTrack !== undefined && event.nextTrack !== null) {
  //         const track = await TrackPlayer.getTrack(event.nextTrack);
  //         setCurrentTrack(track || null);
  //       }
  //     }
  //   );
  //   return () => {
  //     listener.remove();
  //   };
  // }, []);

  const playTrack = async (track: Track) => {
    if (!isPlayerReady) return;
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    setCurrentTrack(track);
  };

  const pause = async () => {
    await TrackPlayer.pause();
  };

  const resume = async () => {
    await TrackPlayer.play();
  };

  const seekTo = async (pos: number) => {
    await TrackPlayer.seekTo(pos);
  };

  const isPlaying = playbackState.state === State.Playing;

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
