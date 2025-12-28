import { ipcMain as r, app as c, dialog as T, shell as R, screen as _, BrowserWindow as f, Menu as V, Tray as u, nativeImage as k } from "electron";
import { fileURLToPath as S } from "node:url";
import L from "os";
import a from "path";
function U() {
  const n = L.hostname().replace(/\.local$/, ""), e = process.platform;
  return e === "darwin" ? `${n}（Mac）` : e === "win32" ? `${n}（Windows）` : n;
}
r.handle("get-device-name", () => U());
r.handle("get-auto-launch", () => c.getLoginItemSettings().openAtLogin);
r.handle("player:get-state", () => s);
r.handle("set-auto-launch", (n, e) => {
  c.setLoginItemSettings({
    openAtLogin: e,
    path: process.execPath
  });
});
r.handle("select-directory", async () => {
  if (!t) return null;
  const n = await T.showOpenDialog(t, {
    properties: ["openDirectory"]
  });
  return n.canceled ? null : n.filePaths[0];
});
r.handle("open-url", (n, e) => (console.log("Opening URL:", e), R.openExternal(e)));
const w = a.dirname(S(import.meta.url));
process.env.DIST = a.join(w, "../dist");
process.env.VITE_PUBLIC = c.isPackaged ? process.env.DIST : a.join(process.env.DIST, "../public");
let t = null, l = null, o = null, y = null, g = null, d = null, h = null, s = {
  isPlaying: !1,
  track: null
}, m = !0, v = !1;
function b(n = !0) {
  const e = s.isPlaying ? "pause.png" : "play.png";
  g?.setImage(a.join(process.env.VITE_PUBLIC, e)), process.platform === "darwin" && n && (s.track ? d?.setTitle(`${s.track.name} - ${s.track.artist}`) : d?.setTitle(""));
  const i = [];
  s.track && i.push(
    { label: `♫ ${s.track.name}`, enabled: !1 },
    { label: `   ${s.track.artist}`, enabled: !1 },
    { type: "separator" },
    { label: "⏮ 上一曲", click: () => t?.webContents.send("player:prev") },
    {
      label: s.isPlaying ? "⏸ 暂停" : "▶️ 播放",
      click: () => t?.webContents.send("player:toggle")
    },
    { label: "⏭ 下一曲", click: () => t?.webContents.send("player:next") },
    { type: "separator" }
  ), i.push(
    { label: "打开播放器", click: () => t?.show() },
    { label: "退出", click: () => c.quit() }
  );
  const p = V.buildFromTemplate(i);
  h?.setContextMenu(p);
}
r.on("player:update", (n, e) => {
  s = { ...s, ...e };
  const i = e.track !== void 0;
  b(i), l?.webContents.send("player:update", e), o?.webContents.send("player:update", e);
});
r.on("settings:update-minimize-to-tray", (n, e) => {
  m = e;
});
r.on("lyric:update", (n, e) => {
  const { currentLyric: i } = e;
  if (process.platform === "darwin") {
    const p = i || (s.track ? `${s.track.name} - ${s.track.artist}` : "");
    d?.setTitle(p);
  }
  l?.webContents.send("lyric:update", e), o?.webContents.send("lyric:update", e);
});
r.on("lyric:settings-update", (n, e) => {
  l?.webContents.send("lyric:settings-update", e);
});
r.on("lyric:open", () => {
  D();
});
r.on("lyric:close", () => {
  l && (l.close(), l = null);
});
r.on("lyric:set-mouse-ignore", (n, e) => {
  l?.setIgnoreMouseEvents(e, { forward: !0 });
});
r.on("player:toggle", () => {
  console.log("Main process: received player:toggle"), t ? (console.log("Main process: forwarding player:toggle to main window"), t.webContents.send("player:toggle")) : console.warn("Main process: win is null, cannot forward player:toggle");
});
r.on("player:next", () => {
  console.log("Main process: received player:next"), t?.webContents.send("player:next");
});
r.on("player:prev", () => {
  t?.webContents.send("player:prev");
});
r.on("player:seek", (n, e) => {
  t?.webContents.send("player:seek", e);
});
r.on("window:set-mini", () => {
  t && (t.hide(), C());
});
r.on("window:restore-main", () => {
  o && (o.close(), o = null), t && (t.show(), t.center());
});
r.on("window:set-always-on-top", (n, e) => {
  o && o.setAlwaysOnTop(e, "floating");
});
function C() {
  if (o) {
    o.show();
    return;
  }
  o = new f({
    width: 360,
    height: 170,
    frame: !1,
    titleBarStyle: "hidden",
    resizable: !1,
    alwaysOnTop: !0,
    // Start always on top
    skipTaskbar: !0,
    hasShadow: !1,
    transparent: !0,
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      preload: a.join(w, "preload.mjs")
    }
  });
  const n = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/mini` : `file://${a.join(process.env.DIST, "index.html")}#/mini`;
  process.env.VITE_DEV_SERVER_URL, o.loadURL(n), process.platform === "darwin" && (o.setAlwaysOnTop(!0, "floating"), o.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 })), o.on("closed", () => {
    o = null;
  });
}
function E() {
  t = new f({
    icon: a.join(process.env.VITE_PUBLIC, "logo.png"),
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
      contextIsolation: !0,
      // 明确开启
      nodeIntegration: !1,
      // 保持安全
      preload: a.join(w, "preload.mjs")
    }
  }), t.on("close", (n) => (!v && m && (n.preventDefault(), t?.hide()), !1)), process.env.VITE_DEV_SERVER_URL ? t.loadURL(process.env.VITE_DEV_SERVER_URL) : t.loadFile(a.join(process.env.DIST, "index.html"));
}
function D() {
  if (l) return;
  const { width: n, height: e } = _.getPrimaryDisplay().workAreaSize, i = 800, p = 120;
  l = new f({
    width: i,
    height: p,
    x: Math.floor((n - i) / 2),
    y: e - p - 50,
    frame: !1,
    transparent: !0,
    alwaysOnTop: !0,
    skipTaskbar: !0,
    resizable: !0,
    hasShadow: !1,
    hiddenInMissionControl: !0,
    // Prevent Mission Control interference
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      preload: a.join(w, "preload.mjs")
    }
  });
  const I = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/lyric` : `${a.join(process.env.DIST, "index.html")}#/lyric`;
  process.env.VITE_DEV_SERVER_URL ? l.loadURL(I) : l.loadURL(`file://${a.join(process.env.DIST, "index.html")}#/lyric`), process.platform === "darwin" && (l.setAlwaysOnTop(!0, "screen-saver"), l.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 })), l.on("closed", () => {
    l = null;
  });
}
function P() {
  const n = (e, i = 20) => k.createFromPath(a.join(process.env.VITE_PUBLIC, e)).resize({ width: i, height: i });
  d = new u(n("next.png")), g = new u(n("play.png")), y = new u(n("previous.png")), h = new u(n("mini_logo.png")), d.on("click", () => {
    t?.webContents.send("player:next");
  }), g.on("click", () => {
    t?.webContents.send("player:toggle");
  }), y.on("click", () => {
    t?.webContents.send("player:prev");
  }), b();
}
c.on("before-quit", () => {
  v = !0;
});
c.whenReady().then(() => {
  E(), P();
});
c.on("window-all-closed", () => {
  process.platform !== "darwin" && c.quit();
});
c.on("activate", () => {
  f.getAllWindows().length === 0 && E();
});
