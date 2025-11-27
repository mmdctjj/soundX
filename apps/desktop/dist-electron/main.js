import { app, BrowserWindow } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    titleBarStyle: "hidden",
    // Enable native window controls on Windows (Minimize, Maximize, Close)
    titleBarOverlay: {
      color: "rgba(0,0,0,0)",
      // Transparent background
      symbolColor: "#ffffff",
      // White symbols
      height: 30
    },
    transparent: process.platform === "darwin",
    // Transparency works best on macOS
    opacity: 0.95,
    // Window opacity (0.0 - 1.0), adjust as needed
    vibrancy: "popover",
    // macOS vibrancy effect
    visualEffectState: "active",
    // Keep vibrancy always active
    webPreferences: {
      preload: path.join(__dirname$1, "preload.js")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST || "", "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
