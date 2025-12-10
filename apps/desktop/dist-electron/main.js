import { app, ipcMain, BrowserWindow, Menu, Tray, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import path from "path";
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.DIST = path.join(__dirname$1, "../dist");
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, "../public");
let win = null;
let trayPrev = null;
let trayPlay = null;
let trayNext = null;
let trayMain = null;
let playerState = {
  isPlaying: false,
  track: null
};
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
});
ipcMain.on("lyric:update", (event, payload) => {
  const { currentLyric } = payload;
  if (process.platform === "darwin") {
    trayNext?.setTitle(currentLyric || "");
  }
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
    transparent: process.platform === "darwin",
    opacity: 0.95,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
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
