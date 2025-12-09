import { app, BrowserWindow, nativeImage, Tray, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "node:url";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win;
let tray = null;
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || "", "logo.png"),
    titleBarStyle: "hidden",
    // Enable native window controls on Windows (Minimize, Maximize, Close)
    titleBarOverlay: {
      color: "rgba(0,0,0,0)",
      // Transparent background
      symbolColor: "#ffffff",
      // White symbols
      height: 30
    },
    resizable: true,
    maximizable: true,
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
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
  win.webContents.on("before-input-event", (event, input) => {
    if (input.key === "i" || input.key === "I") {
      if (process.platform === "darwin") {
        if (input.meta && input.alt) {
          win?.webContents.toggleDevTools();
          event.preventDefault();
        }
      } else {
        if (input.control && input.shift) {
          win?.webContents.toggleDevTools();
          event.preventDefault();
        }
      }
    }
  });
}
function createTray() {
  const iconPath = path.join(process.env.VITE_PUBLIC || "", "mini_logo.png");
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 20, height: 20 });
  tray = new Tray(trayIcon);
  tray.on("click", () => {
    if (!win) return;
    const bounds = tray?.getBounds() ?? { x: 0, y: 0, width: 0, height: 0 };
    const windowBounds = win.getBounds() ?? { width: 0, height: 0 };
    const x = Math.round(bounds.x + bounds.width / 2 - windowBounds.width / 2);
    const y = Math.round(bounds.y + bounds.height);
    win.setBounds({ x, y, width: windowBounds.width, height: windowBounds.height });
    win.isVisible() ? win.hide() : win.show();
  });
  const contextMenu = Menu.buildFromTemplate([
    { label: "打开播放器", click: () => win?.show() },
    { label: "退出", click: () => app.quit() }
  ]);
  tray.setContextMenu(contextMenu);
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
app.whenReady().then(() => {
  createWindow();
  createTray();
});
