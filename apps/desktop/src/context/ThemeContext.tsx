import React, { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useTheme2 } from "../hooks/useTheme";

type ThemeMode = "light" | "dark" | "auto";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: (newMode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme2();
  // Load theme from localStorage or default to 'dark'
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    if (savedTheme === "auto") return theme;
    return savedTheme as ThemeMode;
  });

  useEffect(() => {
    setMode(() => {
      const savedTheme = localStorage.getItem("theme") || "light";
      if (savedTheme === "auto") return theme;
      return savedTheme as ThemeMode;
    });
  }, [theme]);

  const toggleTheme = (newMode: ThemeMode) => {
    setMode(newMode);
    localStorage.setItem("theme", newMode); // Save to localStorage
  };

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
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
