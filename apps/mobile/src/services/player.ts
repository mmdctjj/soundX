import TrackPlayer, {
  AppKilledPlaybackBehavior,
  Capability,
  RepeatMode,
  Event as TrackPlayerEvent,
} from "react-native-track-player";

export async function setupPlayer() {
  let isSetup = false;
  try {
    await TrackPlayer.getCurrentTrack();
    isSetup = true;
  } catch {
    await TrackPlayer.setupPlayer();
    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior:
          AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      progressUpdateEventInterval: 2,
    });

    isSetup = true;
  } finally {
    return isSetup;
  }
}

export async function addTrack() {
  await TrackPlayer.add([
    {
      id: "1",
      url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
      title: "Track 1",
      artist: "Artist 1",
      artwork: "https://picsum.photos/200",
    },
  ]);
  await TrackPlayer.setRepeatMode(RepeatMode.Queue);
}

export async function playbackService() {
  TrackPlayer.addEventListener(TrackPlayerEvent.RemotePlay, () => TrackPlayer.play());
  TrackPlayer.addEventListener(TrackPlayerEvent.RemotePause, () => TrackPlayer.pause());
  TrackPlayer.addEventListener(TrackPlayerEvent.RemoteNext, () => TrackPlayer.skipToNext());
  TrackPlayer.addEventListener(TrackPlayerEvent.RemotePrevious, () =>
    TrackPlayer.skipToPrevious()
  );
  TrackPlayer.addEventListener(TrackPlayerEvent.RemoteSeek, ({ position }: { position: number }) =>
    TrackPlayer.seekTo(position)
  );
}
