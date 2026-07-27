export type { IAudioPlayer, PlayerEvent, PlayerListener, PlayerPayload,
  TimeUpdatePayload, StateChangePayload, ErrorPayload, BufferingPayload } from './src/main/ets/IAudioPlayer';
export { AVPlayerBackend, audioBackend } from './src/main/ets/AVPlayerBackend';
export { parseLRC, findActiveLine } from './src/main/ets/lyrics/LRCParser';
export type { LyricLine } from './src/main/ets/lyrics/LRCParser';