import { SharedSocketService } from "@soundx/ws";
import * as Device from "expo-device";
import { getBaseURL } from "../https";

class MobileSocketService extends SharedSocketService {
  async connectWithContext(userId: number, token: string) {
    if (this.connected) return;

    let deviceName = Device.modelName || "Mobile Device";
    
    // Attempt to get cached device info if needed, but expo-device is usually good
    const url = getBaseURL();

    super.connect({
      url,
      token,
      userId,
      deviceName,
    });
  }
}

export const socketService = new MobileSocketService();
