import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AudioQuality } from "../services/trackQuality";

const isCurrentInternalAddress = async () => {
  const activeAddress = (await AsyncStorage.getItem("serverAddress")) || "";
  const sourceType = (await AsyncStorage.getItem("selectedSourceType")) || "AudioDock";
  if (!activeAddress) return false;

  try {
    const configStr = await AsyncStorage.getItem(`sourceConfig_${sourceType}`);
    if (!configStr) return false;
    const parsed = JSON.parse(configStr);
    const configList = Array.isArray(parsed) ? parsed : [parsed];
    return configList.some((config) => config?.internal === activeAddress);
  } catch {
    return false;
  }
};

export const getCurrentPlaybackQualityPreference = async (qualities: {
  internalPlaybackQuality: AudioQuality;
  externalPlaybackQuality: AudioQuality;
}) =>
  (await isCurrentInternalAddress())
    ? qualities.internalPlaybackQuality
    : qualities.externalPlaybackQuality;
