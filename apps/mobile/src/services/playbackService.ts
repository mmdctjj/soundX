import TrackPlayer, { Event } from 'react-native-track-player';

export const PlaybackService = async function() {

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteStop, () => {
        TrackPlayer.reset();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        TrackPlayer.seekTo(event.position);
    });

    // Handle other events as needed, e.g., JumpForward, JumpBackward for audiobooks
    TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(position + event.interval);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
        const position = await TrackPlayer.getPosition();
        await TrackPlayer.seekTo(Math.max(0, position - event.interval));
    });
};
