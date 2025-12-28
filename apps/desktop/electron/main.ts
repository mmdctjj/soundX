import { app, BrowserWindow, dialog, screen as electronScreen, ipcMain, Menu, nativeImage, net, protocol, shell, Tray } from 'electron';
import { fileURLToPath } from 'node:url';
import os from "os";
import path from 'path';

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

ipcMain.handle("set-auto-launch", (event, enable: boolean) => {
  app.setLoginItemSettings({
    openAtLogin: enable,
    path: process.execPath,
  });
});

ipcMain.handle("select-directory", async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory']
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle("open-url", (event, url: string) => {
  console.log('Opening URL:', url);
  return shell.openExternal(url);
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let lyricWin: BrowserWindow | null = null;
let miniWin: BrowserWindow | null = null;

let trayPrev: Tray | null = null;
let trayPlay: Tray | null = null;
let trayNext: Tray | null = null;
let trayMain: Tray | null = null;

// ---- 播放器状态 ----
let playerState = {
  isPlaying: false,
  track: null as null | { name: string; artist: string; album?: string },
};

let minimizeToTray = true;
let isQuitting = false;

// ---------- UI 更新统一入口 ----------
function updatePlayerUI(shouldUpdateTitle = true) {
  // 1）更新播放按钮图标
  const playIcon = playerState.isPlaying ? "pause.png" : "play.png";
  trayPlay?.setImage(path.join(process.env.VITE_PUBLIC!, playIcon));

  // 2）更新导航栏歌词标题（macOS 专用）
  if (process.platform === "darwin" && shouldUpdateTitle) {
    if (playerState.track) {
      trayNext?.setTitle(`${playerState.track.name} - ${playerState.track.artist}`);
    } else {
      trayNext?.setTitle(""); // 未播放时清空
    }
  }

  // 3）更新右键菜单
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
  // Only update title if track info changed
  const shouldUpdateTitle = payload.track !== undefined;
  updatePlayerUI(shouldUpdateTitle);
  // Sync with lyric window
  lyricWin?.webContents.send("player:update", payload);
  miniWin?.webContents.send("player:update", payload);
});

ipcMain.on("settings:update-minimize-to-tray", (event, value: boolean) => {
  minimizeToTray = value;
});

ipcMain.on("lyric:update", (event, payload) => {
  const { currentLyric } = payload;

  // macOS 托盘标题更新
  if (process.platform === "darwin") {
      const displayTitle = currentLyric || (playerState.track ? `${playerState.track.name} - ${playerState.track.artist}` : "");
      trayNext?.setTitle(displayTitle);
  }

  // 同步桌面投影歌词
  lyricWin?.webContents.send("lyric:update", payload);
  miniWin?.webContents.send("lyric:update", payload);
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

ipcMain.on("lyric:set-mouse-ignore", (event, ignore: boolean) => {
  lyricWin?.setIgnoreMouseEvents(ignore, { forward: true });
});

// Bridge playback controls from lyric window to main window
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

ipcMain.on("player:seek", (event, time: number) => {
  win?.webContents.send("player:seek", time);
});

// ---- 窗口模式切换 ----
ipcMain.on("window:set-mini", () => {
  if (win) {
     win.hide();
     createMiniPlayerWindow();
  }
});

ipcMain.on("window:restore-main", () => {
  if (miniWin) {
     miniWin.close();
     miniWin = null;
  }
  if (win) {
    win.show();
    win.center();
  }
});

ipcMain.on("window:set-always-on-top", (event, enable: boolean) => {
  if (miniWin) {
    miniWin.setAlwaysOnTop(enable, "floating");
  }
});

function createMiniPlayerWindow() {
   if (miniWin) {
      miniWin.show();
      return;
   }

   miniWin = new BrowserWindow({
      width: 360,
      height: 170,
      frame: false,
      titleBarStyle: "hidden",
      resizable: false,
      alwaysOnTop: true, // Start always on top
      skipTaskbar: true,
      hasShadow: false,
      transparent: true,
      webPreferences: {
         contextIsolation: true,
         nodeIntegration: false,
         preload: path.join(__dirname, "preload.mjs"),
      }
   });

   const miniUrl = process.env.VITE_DEV_SERVER_URL
     ? `${process.env.VITE_DEV_SERVER_URL}#/mini`
     : `app://./index.html#/mini`;

   if (process.env.VITE_DEV_SERVER_URL) {
      miniWin.loadURL(miniUrl);
   } else {
      miniWin.loadURL(miniUrl);
   }
   
   // macOS tweaks
   if (process.platform === "darwin") {
      miniWin.setAlwaysOnTop(true, "floating");
      miniWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
   }

   miniWin.on("closed", () => {
      miniWin = null;
   });
}

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
    width: 1020, // 初始宽度
    height: 700, // 初始高度
    minWidth: 1020, // 🔧 设置窗口最小宽度
    minHeight: 700, // 🔧 设置窗口最小高度
    transparent: process.platform === "darwin",
    opacity: 0.95,
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      contextIsolation: true,   // 明确开启
      nodeIntegration: false,  // 保持安全
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  win.on('close', (event) => {
    if (!isQuitting && minimizeToTray) {
      event.preventDefault();
      win?.hide();
    }
    return false;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadURL("app://./index.html");
  }
}

function createLyricWindow() {
  if (lyricWin) return;

  const { width: screenWidth, height: screenHeight } = electronScreen.getPrimaryDisplay().workAreaSize;
  const winWidth = 800;
  const winHeight = 120;

  lyricWin = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: Math.floor((screenWidth - winWidth) / 2),
    y: screenHeight - winHeight - 50,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    hasShadow: false,
    hiddenInMissionControl: true, // Prevent Mission Control interference
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  const lyricUrl = process.env.VITE_DEV_SERVER_URL
    ? `${process.env.VITE_DEV_SERVER_URL}#/lyric`
    : `${path.join(process.env.DIST!, "index.html")}#/lyric`;

  if (process.env.VITE_DEV_SERVER_URL) {
    lyricWin.loadURL(lyricUrl);
  } else {
    lyricWin.loadURL("app://./index.html#/lyric");
  }

  // macOS specific window settings for better "transparency" and persistence
  if (process.platform === "darwin") {
    lyricWin.setAlwaysOnTop(true, "screen-saver");
    lyricWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }

  lyricWin.on("closed", () => {
    lyricWin = null;
  });
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

  trayMain.on("click", () => {
    if (win) {
      if (win.isVisible()) {
        win.focus();
      } else {
        win.show();
      }
    }
  });

  updatePlayerUI();
}

// ---------- APP 生命周期 ----------
app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(() => {
  // Register custom protocol for stable localStorage origin
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    // On Windows/macOS, pathname might start with / followed by ./ or /
    // Normalize to get the relative path inside dist
    let relativePath = pathname === '/' ? 'index.html' : pathname;
    if (relativePath.startsWith('/')) relativePath = relativePath.slice(1);
    
    return net.fetch(`file://${path.join(process.env.DIST!, relativePath)}`);
  });

  createWindow();
  createTray();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  } else {
    win?.show();
  }
});