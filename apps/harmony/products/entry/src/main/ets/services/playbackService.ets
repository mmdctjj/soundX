import { Logger } from 'audiodock_common';
import { audioBackend } from 'features_player';
import { playerStore } from '../context/PlayerStore';
import type { PlayerState } from '../context/PlayerStore';

// media.AVPlayerState -> PlayerStore.PlayerState
// completed/released are intentionally ignored: 'ended' event handles
// end-of-stream advance, released means teardown.
function mapState(s: string): PlayerState | null {
  switch (s) {
    case 'idle': return 'idle';
    case 'initialized': return 'preparing';
    case 'prepared': return 'ready';
    case 'playing': return 'playing';
    case 'paused': return 'paused';
    case 'stopped': return 'stopped';
    case 'error': return 'error';
    default: return null;
  }
}

export function installPlaybackService(): void {
  audioBackend.on('timeUpdate', (p: unknown) => {
    const v = p as { currentMs: number; durationMs: number };
    playerStore.onTimeUpdate(v.currentMs, v.durationMs);
  });
  audioBackend.on('stateChange', (p: unknown) => {
    const v = p as { state: string };
    const mapped = mapState(v.state);
    if (mapped) playerStore.onStateChange(mapped);
  });
  audioBackend.on('ended', () => playerStore.onEndOfStream());
  audioBackend.on('error', () => {
    Logger.e('Playback', 'player error');
    playerStore.onError();
  });
  Logger.i('Playback', 'service installed');
}
