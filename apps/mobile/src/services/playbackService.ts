import TrackPlayer, { Event } from 'react-native-track-player';
import { PLAYER_EVENTS, playerEventEmitter } from '../utils/playerEvents';

export const PlaybackService = async function () {
    console.log('[PlaybackService] Registered');

    TrackPlayer.addEventListener(Event.RemotePlay, () => {
        console.log('[PlaybackService] Event.RemotePlay');
        TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, () => {
        console.log('[PlaybackService] Event.RemotePause');
        TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, () => {
        console.log('[PlaybackService] Event.RemoteNext - Emitting custom event');
        playerEventEmitter.emit(PLAYER_EVENTS.REMOTE_NEXT);
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, () => {
        console.log('[PlaybackService] Event.RemotePrevious - Emitting custom event');
        playerEventEmitter.emit(PLAYER_EVENTS.REMOTE_PREVIOUS);
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
        console.log('[PlaybackService] Event.RemoteSeek:', event.position);
        TrackPlayer.seekTo(event.position);
    });
};
