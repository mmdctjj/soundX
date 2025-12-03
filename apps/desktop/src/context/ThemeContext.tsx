import React, { createContext, useContext, useState } from "react";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Load theme from localStorage or default to 'dark'
  const [mode, setMode] = useState<ThemeMode>(() => {
    const savedTheme = localStorage.getItem("theme");
    return savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : "light";
  });

  const toggleTheme = () => {
    setMode((prev) => {
      const newMode = prev === "light" ? "dark" : "light";
      localStorage.setItem("theme", newMode); // Save to localStorage
      return newMode;
    });
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
