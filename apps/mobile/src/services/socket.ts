import AsyncStorage from "@react-native-async-storage/async-storage";
import { SharedSocketService } from "@soundx/ws";
import * as Device from "expo-device";

class MobileSocketService extends SharedSocketService {
  async connectWithContext(userId: number, token: string) {
    if (this.connected) return;

    let deviceName = Device.modelName || "Mobile Device";
    
    // Attempt to get cached device info if needed, but expo-device is usually good
    const savedAddress = await AsyncStorage.getItem("serverAddress");

    super.connect({
      url: savedAddress || "http://localhost:3000",
      token,
      userId,
      deviceName,
    });
  }
}

export const socketService = new MobileSocketService();
