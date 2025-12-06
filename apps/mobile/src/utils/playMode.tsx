import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";

export type PlayMode = "MUSIC" | "AUDIOBOOK";

interface PlayModeContextType {
  mode: PlayMode;
  setMode: (mode: PlayMode) => void;
}

const PlayModeContext = createContext<PlayModeContextType>({
  mode: "MUSIC",
  setMode: () => {},
});

export const usePlayMode = () => useContext(PlayModeContext);

export const PlayModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mode, setModeState] = useState<PlayMode>("MUSIC");

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const savedMode = await AsyncStorage.getItem("playMode");
      if (savedMode === "MUSIC" || savedMode === "AUDIOBOOK") {
        setModeState(savedMode);
      }
    } catch (error) {
      console.error("Failed to load play mode:", error);
    }
  };

  const setMode = async (newMode: PlayMode) => {
    setModeState(newMode);
    try {
      await AsyncStorage.setItem("playMode", newMode);
    } catch (error) {
      console.error("Failed to save play mode:", error);
    }
  };

  return (
    <PlayModeContext.Provider value={{ mode, setMode }}>
      {children}
    </PlayModeContext.Provider>
  );
};
