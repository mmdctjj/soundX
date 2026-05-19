import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { useSettings } from "./SettingsContext";
import { compileForMobile, mergeWithBaseTheme, type VisualPluginTokens } from "@soundx/plugin-runtime";

type ThemeType = "light" | "dark" | "festive";

interface ThemeColors {
  background: string;
  text: string;
  primary: string;
  secondary: string;
  card: string;
  border: string;
  tabBar: string;
  tabIconActive: string;
  tabIconInactive: string;
}

const lightColors: ThemeColors = {
  background: "#FFFFFF",
  text: "#000000",
  primary: "#000000",
  secondary: "#666666",
  card: "#F5F5F5",
  border: "#E0E0E0",
  tabBar: "#FFFFFF",
  tabIconActive: "#000000",
  tabIconInactive: "#888888",
};

const darkColors: ThemeColors = {
  background: "#000000",
  text: "#FFFFFF",
  primary: "#FFFFFF",
  secondary: "#AAAAAA",
  card: "#1A1A1A",
  border: "#333333",
  tabBar: "#000000",
  tabIconActive: "#FFFFFF",
  tabIconInactive: "#666666",
};

const festiveColors: ThemeColors = {
  background: "#8E1C1C", // Softer, more elegant Red
  text: "#D4AF37",       // Muted Antique Gold
  primary: "#D4AF37",    // Muted Antique Gold
  secondary: "#BCA37F",  // Muted Parchment/Tan for subtitles
  card: "#9E2626",       // More subtle Red Card
  border: "#D4AF37",     // Muted Antique Gold
  tabBar: "#8E1C1C",     // Match background
  tabIconActive: "#D4AF37", // Muted Antique Gold
  tabIconInactive: "#EF9A9A", // Light Red
};

export interface MobilePluginVisualState {
  lyricStyle: {
    activeColor: string;
    inactiveColor: string;
    activeScale: number;
    inactiveOpacity: number;
    fontWeightActive: string;
    fontWeightInactive: string;
    springFriction: number;
    springTension: number;
  };
  coverStyle: {
    radius: number;
    borderWidth: number;
    borderColor: string;
    shadowOpacity: number;
    shadowRadius: number;
  };
}

interface ThemeContextType {
  theme: ThemeType;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
  pluginVisual: MobilePluginVisualState;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  colors: lightColors,
  toggleTheme: () => {},
  setTheme: () => {},
  pluginVisual: {
    lyricStyle: {
      activeColor: "#FFFFFF", inactiveColor: "#AAAAAA", activeScale: 1.1, inactiveOpacity: 0.4, fontWeightActive: "800", fontWeightInactive: "500", springFriction: 8, springTension: 40
    },
    coverStyle: { radius: 24, borderWidth: 0, borderColor: "transparent", shadowOpacity: 0.25, shadowRadius: 12 }
  },
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<ThemeType>("light");
  const systemColorScheme = useColorScheme();
  const { autoTheme } = useSettings();

  useEffect(() => {
    if (autoTheme && systemColorScheme) {
      setThemeState(systemColorScheme as ThemeType);
    }
  }, [autoTheme, systemColorScheme]);

  useEffect(() => {
    if (!autoTheme) {
      loadTheme();
    }
  }, [autoTheme]);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("theme");
      if (savedTheme === "dark" || savedTheme === "light" || savedTheme === "festive") {
        setThemeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };


  const [pluginThemeColors, setPluginThemeColors] = useState<Partial<ThemeColors>>({});
  const [pluginVisual, setPluginVisual] = useState<MobilePluginVisualState>({
    lyricStyle: {
      activeColor: "#FFFFFF",
      inactiveColor: "#AAAAAA",
      activeScale: 1.1,
      inactiveOpacity: 0.4,
      fontWeightActive: "800",
      fontWeightInactive: "500",
      springFriction: 8,
      springTension: 40,
    },
    coverStyle: {
      radius: 24,
      borderWidth: 0,
      borderColor: "transparent",
      shadowOpacity: 0.25,
      shadowRadius: 12,
    },
  });

  useEffect(() => {
    const loadPlugin = async () => {
      try {
        const raw = await AsyncStorage.getItem("visual_plugin_tokens");
        if (!raw) return;
        const tokens = JSON.parse(raw) as VisualPluginTokens;
        const compiled = compileForMobile(tokens);
        setPluginThemeColors(compiled.themeColors as Partial<ThemeColors>);
        setPluginVisual({
          lyricStyle: {
            ...compiled.lyrics,
            springFriction: compiled.motion.spring.friction,
            springTension: compiled.motion.spring.tension,
          },
          coverStyle: compiled.cover,
        });
      } catch (error) {
        console.error("Failed to load visual plugin:", error);
      }
    };

    loadPlugin();
  }, []);

  const setTheme = async (newTheme: ThemeType) => {
    if (autoTheme) return;
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem("theme", newTheme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  const toggleTheme = async () => {
    if (autoTheme) return; // Prevent manual toggle when auto mode is on
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  const baseColors = theme === "light" ? lightColors : (theme === "dark" ? darkColors : festiveColors);
  const colors = useMemo(() => mergeWithBaseTheme(baseColors, pluginThemeColors), [baseColors, pluginThemeColors]);

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme, pluginVisual }}>
      <StatusBar style={theme === "light" ? "dark" : "light"} />
      {children}
    </ThemeContext.Provider>
  );
};
