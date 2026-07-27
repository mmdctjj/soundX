export type PlayerEvent =
  | 'timeUpdate' | 'ended' | 'error' | 'stateChange'
  | 'bufferingUpdate' | 'durationUpdate';

export interface TimeUpdatePayload { currentMs: number; durationMs: number }
export interface StateChangePayload { state: string }
export interface ErrorPayload { message: string }
export interface BufferingPayload { value: number }

export type PlayerPayload = TimeUpdatePayload | StateChangePayload | ErrorPayload | BufferingPayload | null;

export type PlayerListener = (payload: PlayerPayload) => void;

export interface IAudioPlayer {
  load(url: string, headers?: Record<string, string>): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  release(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setSpeed(speed: number): Promise<void>;
  setVolume(v: number): Promise<void>;
  on(event: PlayerEvent, cb: PlayerListener): void;
  off(event: PlayerEvent, cb?: PlayerListener): void;
}