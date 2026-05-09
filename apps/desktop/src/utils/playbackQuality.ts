import type { AudioQuality } from "../services/trackQuality";

const isCurrentInternalAddress = () => {
  const activeAddress = localStorage.getItem("serverAddress") || "";
  const sourceType = localStorage.getItem("selectedSourceType") || "AudioDock";
  if (!activeAddress) return false;

  try {
    const configStr = localStorage.getItem(`sourceConfig_${sourceType}`);
    if (!configStr) return false;
    const parsed = JSON.parse(configStr);
    const configList = Array.isArray(parsed) ? parsed : [parsed];
    return configList.some((config) => config?.internal === activeAddress);
  } catch {
    return false;
  }
};

export const getCurrentPlaybackQualityPreference = (qualities: {
  internalPlaybackQuality: AudioQuality;
  externalPlaybackQuality: AudioQuality;
}) =>
  isCurrentInternalAddress()
    ? qualities.internalPlaybackQuality
    : qualities.externalPlaybackQuality;
