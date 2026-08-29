import type { AudioQuality } from "../services/trackQuality";

/**
 * 当前生效的服务器地址是否等于已配置的「内网地址」。
 *
 * 除了音质选择，封面/头像的分级加载也依赖这个判定（见 imageBucket.ts 的
 * THUMBNAIL_MAX_WIDTH）：只有超过缩略图档位的大图才看网络环境。
 */
export const isCurrentInternalAddress = () => {
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
