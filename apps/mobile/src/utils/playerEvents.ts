// [v2 - Fixed Import] Shared event emitter for player-related events 
// This file does NOT use the Node 'events' module!

type Callback = (...args: any[]) => void;

class SimpleEventEmitter {
  private listeners: { [event: string]: Callback[] } = {};

  on(event: string, callback: Callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, ...args: any[]) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((callback) => callback(...args));
    }
  }

  removeListener(event: string, callback: Callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }
}

export const playerEventEmitter = new SimpleEventEmitter();

export const PLAYER_EVENTS = {
  REMOTE_NEXT: 'REMOTE_NEXT',
  REMOTE_PREVIOUS: 'REMOTE_PREVIOUS',
  REMOTE_JUMP_FORWARD: 'REMOTE_JUMP_FORWARD',
  REMOTE_JUMP_BACKWARD: 'REMOTE_JUMP_BACKWARD',
  REMOTE_SPEED: 'REMOTE_SPEED',
};
