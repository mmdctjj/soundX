import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useSystemTheme } from "../hooks/useTheme";
import { useSettingsStore } from "../store/settings";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  mode: "light" | "dark"; // The actual applied mode
  themeSetting: ThemeMode; // The user's choice
  setTheme: (newMode: ThemeMode) => void;
  toggleTheme: () => void; // For cycling in Header icon
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemTheme = useSystemTheme();
  const themeSetting = useSettingsStore((state) => state.general.theme);
  const updateGeneral = useSettingsStore((state) => state.updateGeneral);

  const [appliedMode, setAppliedMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    if (themeSetting === "system") {
      setAppliedMode(systemTheme as "light" | "dark");
    } else {
      setAppliedMode(themeSetting as "light" | "dark");
    }
  }, [themeSetting, systemTheme]);

  const setTheme = (newMode: ThemeMode) => {
    updateGeneral("theme", newMode);
  };

  const toggleTheme = () => {
    const modes: ThemeMode[] = ["light", "dark", "system"];
    const currentIndex = modes.indexOf(themeSetting);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  return (
    <ThemeContext.Provider value={{ mode: appliedMode, themeSetting, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
