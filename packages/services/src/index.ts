export * from "./adapter/manager";
export * from "./admin";
export * from "./album";
export * from "./artist";
export * from "./asr";
export * from "./auth";
export * from "./collection";
export * from "./config";
export * from "./folder";
export * from "./import";
export * from "./llm";
export * from "./llmConfig";
export * from "./metadataPlugins";
export * from "./mi";
export * from "./models";
export * from "./mv";
export * from "./playlist";
export * from "./plus";
export * from "./request";
export * from "./scan-login";
export * from "./search";
export * from "./search-record";
export * from "./track";
export * from "./tts";
export * from "./ttsConfig";
export * from "./user";
export * from "./userAudiobookHistory";
export * from "./webdav";

export const SOURCEMAP = {
    AudioDock: "audiodock",
    Subsonic: "subsonic",
    Emby: "emby",
}

export const SOURCETIPSMAP = {
    AudioDock: "所有支持 AudioDock 官方服务端",
    Subsonic: "所有支持 Subsonic 协议的服务端，例如：Navidrome、Gonic 等",
    Emby: "所有支持 Emby 协议的服务端",
}
