import { SharedSocketService } from "@soundx/ws";
import { useAuthStore } from "../store/auth";

class SocketService extends SharedSocketService {
  async connect() {
    // 1. Get Dependencies
    const { token, user } = useAuthStore.getState();
    if (!token || !user || this.connected) return;

    // 2. Get Device Name (Desktop Specific)
    let deviceName = "Desktop Client";
    const device = JSON.parse(localStorage.getItem("device") || "{}");
    if (device?.name) {
        deviceName = device.name;
    } else {
        try {
            if ((window as any).ipcRenderer?.getName) {
                deviceName = await (window as any).ipcRenderer.getName();
            }
        } catch (e) {
            console.error("Failed to get device name", e);
        }
    }

    // 3. Get Base URL (Desktop Specific - matches `http` client logic)
    let url = import.meta.env.VITE_API_URL || "http://localhost:3000";
    try {
        const storedAddress = localStorage.getItem("serverAddress");
        if (storedAddress) {
            url = storedAddress;
        }
    } catch (e) {
        console.error("Failed to get server address for socket:", e);
    }

    // 4. Connect using Shared Implementation
    super.connect({
        url,
        token,
        userId: user.id,
        deviceName
    });
  }
}

export const socketService = new SocketService();
