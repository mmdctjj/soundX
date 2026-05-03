import { EventEmitter, requireNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

type BridgeAction =
  | "play"
  | "pause"
  | "toggle"
  | "next"
  | "previous"
  | "seek"
  | "jumpForward"
  | "jumpBackward";

export interface MediaControlBridgeEvent {
  action: BridgeAction;
  position?: number;
  interval?: number;
}

let moduleRef: any = null;
try {
  moduleRef =
    Platform.OS === "android" || Platform.OS === "ios"
      ? requireNativeModule("MediaControlBridge")
      : null;
} catch (e) {
  console.log("[MediaControlBridge] Native module not found, bridge disabled.");
}

// 修正：在 TypeScript 中正确声明 EventEmitter 的事件类型，解决 addListener 报错
const emitter = moduleRef ? new EventEmitter<{ MediaControlBridgeEvent: (event: MediaControlBridgeEvent) => void }>(moduleRef) : null;

export const isMediaControlBridgeAvailable = (): boolean => {
  return (Platform.OS === "android" || Platform.OS === "ios") && !!moduleRef;
};

export const startMediaControlBridge = async (): Promise<void> => {
  if (!isMediaControlBridgeAvailable()) return;
  try {
    await moduleRef.startListening();
  } catch (e) {
    console.warn("[MediaControlBridge] startListening failed:", e);
  }
};

export const stopMediaControlBridge = async (): Promise<void> => {
  if (!isMediaControlBridgeAvailable()) return;
  try {
    await moduleRef.stopListening();
  } catch (e) {
    console.warn("[MediaControlBridge] stopListening failed:", e);
  }
};

export const updateMediaControlBridgePlaybackState = async (params: {
  state: "playing" | "paused" | "buffering" | "loading" | "stopped" | "none";
  position?: number;
  speed?: number;
  canSkipNext?: boolean;
  canSkipPrevious?: boolean;
}) => {
  if (!isMediaControlBridgeAvailable()) return;
  try {
    await moduleRef.updatePlaybackState(
      params.state,
      params.position ?? 0,
      params.speed ?? 1,
      params.canSkipNext ?? true,
      params.canSkipPrevious ?? true
    );
  } catch (e) {
    console.warn("[MediaControlBridge] updatePlaybackState failed:", e);
  }
};

export const updateMediaControlBridgeMetadata = async (params: {
  title?: string;
  artist?: string;
  album?: string;
  duration?: number;
  lyrics?: string;
}) => {
  if (!isMediaControlBridgeAvailable()) return;
  try {
    await moduleRef.updateMetadata(
      params.title ?? "",
      params.artist ?? "",
      params.album ?? "",
      params.duration ?? 0,
      params.lyrics ?? ""
    );
  } catch (e) {
    console.warn("[MediaControlBridge] updateMetadata failed:", e);
  }
};

export const subscribeMediaControlBridgeEvents = (
  callback: (event: MediaControlBridgeEvent) => void
) => {
  if (!emitter) return { remove: () => {} };
  // @ts-ignore: 我们已经在构造函数中声明了类型，但在某些版本中可能仍需忽略
  return emitter.addListener("MediaControlBridgeEvent", callback);
};

/**
 * 仅更新当前歌词行（轻量调用，不重推完整元数据）
 * 用于 CarWith / Android Auto / CarPlay 歌词实时滚动
 */
export const updateMediaControlBridgeLyrics = async (lyrics: string): Promise<void> => {
  if (!isMediaControlBridgeAvailable()) return;
  try {
    // 复用 updateMetadata，仅传 lyrics 字段，其余传空避免覆盖现有数据
    await moduleRef.updateMetadata("", "", "", 0, lyrics);
  } catch (e) {
    console.warn("[MediaControlBridge] updateLyrics failed:", e);
  }
};
