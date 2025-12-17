import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth";

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  async connect() {
    const { token, user } = useAuthStore.getState();
    if (!token || !user || this.socket?.connected) return;

    // Desktop hostname retrieval from preload script or fallback
    let deviceName = "Desktop Client";
    try {
      if ((window).ipcRenderer?.getName) {
        deviceName = await (window).ipcRenderer.getName();
      }
    } catch (e) {
      console.error("Failed to get device name", e);
    }

    this.socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000", {
      query: {
        userId: user.id,
        deviceName: deviceName,
      },
      transports: ["websocket"],
      auth: {
        token,
      }
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    // Re-attach listeners
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(cb => this.socket?.on(event, cb as any));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn("Socket not connected, cannot emit:", event);
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event) || [];
      const idx = callbacks.indexOf(callback);
      if (idx !== -1) {
        callbacks.splice(idx, 1);
      }
      this.socket?.off(event, callback as any);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  get id() {
    return this.socket?.id;
  }
}

export const socketService = new SocketService();
