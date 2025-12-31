import TrackPlayer, { Event } from 'react-native-track-player';
import { PLAYER_EVENTS, playerEventEmitter } from '../utils/playerEvents';
console.log('[PlaybackService] File evaluated');

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

    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
        console.log('[PlaybackService] Event.RemoteStop');
        await TrackPlayer.pause();
        await TrackPlayer.reset();
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

    TrackPlayer.addEventListener(Event.RemoteJumpForward, (event) => {
        const interval = event.interval || 15;
        console.log('[PlaybackService] Event.RemoteJumpForward:', interval);
        playerEventEmitter.emit(PLAYER_EVENTS.REMOTE_JUMP_FORWARD, interval);
    });

    TrackPlayer.addEventListener(Event.RemoteJumpBackward, (event) => {
        const interval = event.interval || 15;
        console.log('[PlaybackService] Event.RemoteJumpBackward:', interval);
        playerEventEmitter.emit(PLAYER_EVENTS.REMOTE_JUMP_BACKWARD, interval);
    });

    TrackPlayer.addEventListener(Event.RemoteLike, () => {
        console.log('[PlaybackService] Event.RemoteLike (Speed Toggle)');
        playerEventEmitter.emit(PLAYER_EVENTS.REMOTE_SPEED);
    });
};
