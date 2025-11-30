import { TrackType } from "@soundx/db";
import { useEffect, useState } from "react";

export type PlayMode = TrackType;

const PLAY_MODE_KEY = "playMode";
const EVENT_NAME = "soundx:play-mode-change";

export const getPlayMode = (): PlayMode => {
  if (typeof localStorage === "undefined") return "MUSIC";
  const stored = localStorage.getItem(PLAY_MODE_KEY);
  if (stored === "audiobook" || stored === "AUDIOBOOK") return "AUDIOBOOK";
  return "MUSIC";
};

export const setPlayMode = (mode: PlayMode) => {
  localStorage.setItem(PLAY_MODE_KEY, mode);
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
};

export const usePlayMode = () => {
  const [mode, setMode] = useState<PlayMode>(getPlayMode());

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PLAY_MODE_KEY) {
        const newValue = e.newValue;
        if (newValue === "audiobook" || newValue === "AUDIOBOOK") {
          setMode("AUDIOBOOK");
        } else {
          setMode("MUSIC");
        }
      }
    };

    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<PlayMode>;
      setMode(customEvent.detail);
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(EVENT_NAME, handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(EVENT_NAME, handleCustomChange);
    };
  }, []);

  return { mode, setMode: setPlayMode };
};

