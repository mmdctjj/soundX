import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import { fileURLToPath } from 'node:url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;

let trayPrev: Tray | null = null;
let trayPlay: Tray | null = null;
let trayNext: Tray | null = null;
let trayMain: Tray | null = null;

// ---- 播放器状态 ----
let playerState = {
  isPlaying: false,
  track: null as null | { name: string; artist: string; album?: string },
};

// ---------- UI 更新统一入口 ----------
function updatePlayerUI() {
  // 1）更新播放按钮图标
  const playIcon = playerState.isPlaying ? "pause.png" : "play.png";
  trayPlay?.setImage(path.join(process.env.VITE_PUBLIC!, playIcon));

  // 2）更新右键菜单
  const menuItems: any[] = [];

  if (playerState.track) {
    menuItems.push(
      { label: `♫ ${playerState.track.name}`, enabled: false },
      { label: `   ${playerState.track.artist}`, enabled: false },
      { type: 'separator' },
      { label: "⏮ 上一曲", click: () => win?.webContents.send("player:prev") },
      {
        label: playerState.isPlaying ? "⏸ 暂停" : "▶️ 播放",
        click: () => win?.webContents.send("player:toggle"),
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

// ---------- IPC：合并为一个事件 ----------
ipcMain.on("player:update", (event, payload) => {
  playerState = { ...playerState, ...payload };
  updatePlayerUI();
});

// ---------- 创建窗口 ----------
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC!, 'logo.png'),
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "rgba(0,0,0,0)",
      symbolColor: "#ffffff",
      height: 30,
    },
    transparent: process.platform === "darwin",
    opacity: 0.95,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST!, "index.html"));
  }
}

// ---------- 托盘 ----------
function createTray() {
  const img = (name: string, size = 20) =>
    nativeImage
      .createFromPath(path.join(process.env.VITE_PUBLIC!, name))
      .resize({ width: size, height: size });
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

// ---------- APP 生命周期 ----------
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
