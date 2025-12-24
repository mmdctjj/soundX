import { ipcMain, app, dialog, shell, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import os from "os";
import path from "path";
function getDeviceName() {
  const hostname = os.hostname().replace(/\.local$/, "");
  const platform = process.platform;
  if (platform === "darwin") return `${hostname}（Mac）`;
  if (platform === "win32") return `${hostname}（Windows）`;
  return hostname;
}
ipcMain.handle("get-device-name", () => {
  return getDeviceName();
});
ipcMain.handle("get-auto-launch", () => {
  return app.getLoginItemSettings().openAtLogin;
});
ipcMain.handle("player:get-state", () => {
  return playerState;
});
ipcMain.handle("set-auto-launch", (event, enable) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath
  });
});
ipcMain.handle("select-directory", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"]
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});
ipcMain.handle("open-url", (event, url) => {
  console.log("Opening URL:", url);
  return shell.openExternal(url);
});
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win = null;
let lyricWin = null;
let trayPrev = null;
let trayPlay = null;
let trayNext = null;
let trayMain = null;
let playerState = {
  isPlaying: false,
  track: null
};
let minimizeToTray = true;
let isQuitting = false;
function updatePlayerUI() {
  const playIcon = playerState.isPlaying ? "pause.png" : "play.png";
  trayPlay?.setImage(path.join(process.env.VITE_PUBLIC, playIcon));
  if (process.platform === "darwin") {
    if (playerState.track) {
      trayNext?.setTitle(`${playerState.track.name} - ${playerState.track.artist}`);
    } else {
      trayNext?.setTitle("");
    }
  }
  const menuItems = [];
  if (playerState.track) {
    menuItems.push(
      { label: `♫ ${playerState.track.name}`, enabled: false },
      { label: `   ${playerState.track.artist}`, enabled: false },
      { type: "separator" },
      { label: "⏮ 上一曲", click: () => win?.webContents.send("player:prev") },
      {
        label: playerState.isPlaying ? "⏸ 暂停" : "▶️ 播放",
        click: () => win?.webContents.send("player:toggle")
      },
      { label: "⏭ 下一曲", click: () => win?.webContents.send("player:next") },
      { type: "separator" }
    );
  }
  menuItems.push(
    { label: "打开播放器", click: () => win?.show() },
    { label: "退出", click: () => app.quit() }
  );
  const menu = Menu.buildFromTemplate(menuItems);
  trayMain?.setContextMenu(menu);
}
ipcMain.on("player:update", (event, payload) => {
  playerState = { ...playerState, ...payload };
  updatePlayerUI();
  lyricWin?.webContents.send("player:update", payload);
});
ipcMain.on("settings:update-minimize-to-tray", (event, value) => {
  minimizeToTray = value;
});
ipcMain.on("lyric:update", (event, payload) => {
  const { currentLyric } = payload;
  if (process.platform === "darwin") {
    trayNext?.setTitle(currentLyric || "");
  }
  lyricWin?.webContents.send("lyric:update", payload);
});
ipcMain.on("lyric:settings-update", (event, payload) => {
  lyricWin?.webContents.send("lyric:settings-update", payload);
});
ipcMain.on("lyric:open", () => {
  createLyricWindow();
});
ipcMain.on("lyric:close", () => {
  if (lyricWin) {
    lyricWin.close();
    lyricWin = null;
  }
});
ipcMain.on("lyric:set-mouse-ignore", (event, ignore) => {
  lyricWin?.setIgnoreMouseEvents(ignore, { forward: true });
});
ipcMain.on("player:toggle", () => {
  console.log("Main process: received player:toggle");
  if (win) {
    console.log("Main process: forwarding player:toggle to main window");
    win.webContents.send("player:toggle");
  } else {
    console.warn("Main process: win is null, cannot forward player:toggle");
  }
});
ipcMain.on("player:next", () => {
  console.log("Main process: received player:next");
  win?.webContents.send("player:next");
});
ipcMain.on("player:prev", () => {
  win?.webContents.send("player:prev");
});
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "logo.png"),
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "rgba(0,0,0,0)",
      symbolColor: "#ffffff",
      height: 30
    },
    width: 1020,
    // 初始宽度
    height: 700,
    // 初始高度
    minWidth: 1020,
    // 🔧 设置窗口最小宽度
    minHeight: 700,
    // 🔧 设置窗口最小高度
    transparent: process.platform === "darwin",
    opacity: 0.95,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      contextIsolation: true,
      // 明确开启
      nodeIntegration: false,
      // 保持安全
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.on("close", (event) => {
    if (!isQuitting && minimizeToTray) {
      event.preventDefault();
      win?.hide();
    }
    return false;
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
}
function createLyricWindow() {
  if (lyricWin) return;
  lyricWin = new BrowserWindow({
    width: 800,
    height: 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    hiddenInMissionControl: true,
    // Prevent Mission Control interference
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  const lyricUrl = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/lyric` : `${path.join(process.env.DIST, "index.html")}#/lyric`;
  if (process.env.VITE_DEV_SERVER_URL) {
    lyricWin.loadURL(lyricUrl);
  } else {
    lyricWin.loadURL(`file://${path.join(process.env.DIST, "index.html")}#/lyric`);
  }
  if (process.platform === "darwin") {
    lyricWin.setAlwaysOnTop(true, "screen-saver");
    lyricWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  lyricWin.on("closed", () => {
    lyricWin = null;
  });
}
function createTray() {
  const img = (name, size = 20) => nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC, name)).resize({ width: size, height: size });
  trayNext = new Tray(img("next.png"));
  trayPlay = new Tray(img("play.png"));
  trayPrev = new Tray(img("previous.png"));
  trayMain = new Tray(img("mini_logo.png"));
  trayNext.on("click", () => {
    win?.webContents.send("player:next");
  });
  trayPlay.on("click", () => {
    win?.webContents.send("player:toggle");
  });
  trayPrev.on("click", () => {
    win?.webContents.send("player:prev");
  });
  updatePlayerUI();
}
app.on("before-quit", () => {
  isQuitting = true;
});
app.whenReady().then(() => {
  createWindow();
  createTray();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
