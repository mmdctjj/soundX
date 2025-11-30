export const isElectron = () => {
  return typeof window !== "undefined" && window.ipcRenderer !== undefined;
};

export const getPlatform = () => {
  if (typeof window !== "undefined" && window.platform) {
    return window.platform;
  }
  return "web";
};

export const isMac = () => {
  return getPlatform() === "darwin";
};

export const isWindows = () => {
  return getPlatform() === "win32";
};

export const isWeb = () => {
  return !isElectron();
};

// Add type definition for window.platform
declare global {
  interface Window {
    platform?: string;
    ipcRenderer?: any;
  }
}
