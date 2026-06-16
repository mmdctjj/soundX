import { spawn as Q } from "child_process";
import { app as u, ipcMain as i, dialog as ie, shell as R, net as $, screen as se, BrowserWindow as L, protocol as V, nativeTheme as K, Menu as F, nativeImage as M, Tray as T } from "electron";
import l from "fs";
import { fileURLToPath as ce, pathToFileURL as H } from "node:url";
import P from "os";
import r from "path";
import { Readable as X } from "stream";
import { pipeline as pe } from "stream/promises";
u.name = "AudioDock";
process.platform === "darwin" && (process.title = "AudioDock");
const G = () => K.shouldUseDarkColors ? "#ffffff" : "#1f1f1f", Z = () => {
  if (!(!n || process.platform !== "win32"))
    try {
      n.setTitleBarOverlay({
        color: "rgba(0,0,0,0)",
        symbolColor: G(),
        height: 30
      });
    } catch {
    }
};
function de() {
  const t = P.hostname().replace(/\.local$/, ""), e = process.platform;
  return e === "darwin" ? `${t}（Mac）` : e === "win32" ? `${t}（Windows）` : t;
}
const ue = (t) => new Promise((e) => {
  const o = Q("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "a:0",
    "-show_entries",
    "stream=codec_name",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    t
  ]);
  let a = "";
  o.stdout.on("data", (d) => a += d.toString()), o.on("close", () => e(a.trim())), o.on("error", (d) => {
    console.warn("ffprobe failed", d), e("");
  });
});
i.handle("get-device-name", () => de());
i.handle("get-auto-launch", () => u.getLoginItemSettings().openAtLogin);
i.handle("player:get-state", () => g);
i.handle("set-auto-launch", (t, e) => {
  u.setLoginItemSettings({
    openAtLogin: e,
    path: process.execPath
  });
});
i.handle("select-directory", async () => {
  if (!n) return null;
  const t = await ie.showOpenDialog(n, {
    properties: ["openDirectory"]
  });
  return t.canceled ? null : t.filePaths[0];
});
i.handle("open-url", (t, e) => (console.log("Opening URL:", e), R.openExternal(e)));
i.handle("open-directory", async (t, e) => {
  const o = e.replace(/^~/, P.homedir());
  if (!l.existsSync(o))
    try {
      l.mkdirSync(o, { recursive: !0 });
    } catch (a) {
      return console.error("Failed to create directory:", a), "Directory does not exist and could not be created";
    }
  return R.openPath(o);
});
const p = r.join(u.getPath("userData"), "audio_cache");
l.existsSync(p) || l.mkdirSync(p, { recursive: !0 });
const fe = r.join(P.homedir(), "Music/Downloads"), ee = (t) => (j || fe).trim().replace(/^~/, P.homedir()), J = (t) => {
  try {
    return l.statSync(t).size;
  } catch {
    return 0;
  }
}, he = (t, e) => {
  let o = r.dirname(t);
  const a = r.resolve(e);
  for (; o.startsWith(a) && o !== a; )
    try {
      if (l.readdirSync(o).length > 0) break;
      l.rmdirSync(o), o = r.dirname(o);
    } catch {
      break;
    }
}, te = () => {
  if (!l.existsSync(p)) return [];
  const t = [];
  for (const e of l.readdirSync(p))
    if (e.endsWith(".json"))
      try {
        const o = JSON.parse(l.readFileSync(r.join(p, e), "utf8"));
        t.push(o);
      } catch (o) {
        console.warn(`[Main] Failed to parse cache metadata ${e}`, o);
      }
  return t;
}, me = (t, e, o, a) => {
  const d = decodeURIComponent(a), b = r.basename(d), s = e === "MUSIC" ? "music" : r.join("audio", o.replace(/[/\\?%*:|"<>]/g, "-"));
  return {
    filePath: r.join(t.replace(/^~/, P.homedir()), s, b),
    relPath: r.join(s, b).replace(/\\/g, "/")
  };
}, D = /* @__PURE__ */ new Map();
i.handle("cache:check", async (t, e, o, a, d, b) => {
  const s = r.join(p, `${e}.json`);
  if (!l.existsSync(s)) return null;
  try {
    const y = JSON.parse(l.readFileSync(s, "utf8"));
    if (!y.localPath) return null;
    const c = r.join(a.replace(/^~/, P.homedir()), y.localPath);
    if (l.existsSync(c) && l.statSync(c).size > 0)
      return `media://audio/${y.localPath}`;
  } catch (y) {
    console.error("[Main] cache:check error", y);
  }
  return null;
});
i.handle("cache:download", async (t, e, o, a, d, b, s, y) => {
  if (D.has(e)) return D.get(e);
  const c = (async () => {
    let f = "";
    try {
      const { filePath: v, relPath: S } = me(a, d, b, new URL(o).pathname), w = r.dirname(v);
      if (l.existsSync(w) || l.mkdirSync(w, { recursive: !0 }), f = v + ".tmp", l.existsSync(v))
        return s.localPath = S, l.writeFileSync(r.join(p, `${e}.json`), JSON.stringify(s, null, 2)), `media://audio/${S}`;
      console.log(`[Main] Starting split download for track ${e}: ${o}`);
      const A = { "User-Agent": "SoundX-Desktop" };
      y && (A.Authorization = `Bearer ${y}`);
      const C = await $.fetch(o, { headers: A });
      if (!C.ok) throw new Error(`Fetch failed: ${C.status}`);
      const O = C.body;
      if (!O) throw new Error("Body empty");
      if (await pe(X.fromWeb(O), l.createWriteStream(f)), l.renameSync(f, v), s.cover)
        try {
          const E = s.cover;
          console.log(`[Main] Downloading cover: ${E}`);
          const le = r.extname(new URL(E).pathname) || ".jpg", z = `${e}_cover${le}`, I = await $.fetch(E);
          if (I.ok && I.body) {
            const W = I.headers.get("content-type");
            if (W && W.includes("text/html"))
              throw new Error("Received HTML instead of image (likely dev server fallback)");
            const B = await I.arrayBuffer(), N = Buffer.from(B.slice(0, 10)).toString();
            if (N.toLowerCase().includes("<!doc") || N.toLowerCase().includes("<html"))
              throw new Error("Response content looks like HTML");
            l.writeFileSync(r.join(p, z), Buffer.from(B)), s.cover = `media://cover/${z}`;
          }
        } catch (E) {
          console.error("[Main] Cover download failed:", E);
        }
      return s.localPath = S, l.writeFileSync(r.join(p, `${e}.json`), JSON.stringify(s, null, 2)), console.log(`[Main] Successfully cached/downloaded track ${e}`), `media://audio/${S}`;
    } catch (v) {
      if (console.error(`[Main] Split download failed for ${e}:`, v), f && l.existsSync(f)) try {
        l.unlinkSync(f);
      } catch {
      }
      return null;
    } finally {
      D.delete(e);
    }
  })();
  return D.set(e, c), c;
});
i.handle("cache:list", async (t, e, o) => {
  try {
    const a = [];
    if (!l.existsSync(p)) return [];
    const d = l.readdirSync(p);
    for (const b of d)
      if (b.endsWith(".json"))
        try {
          const s = JSON.parse(l.readFileSync(r.join(p, b), "utf8"));
          if (s.type === o) {
            const y = r.join(e.replace(/^~/, P.homedir()), s.localPath);
            l.existsSync(y) && a.push(s);
          }
        } catch {
        }
    return a;
  } catch (a) {
    return console.error("[Main] cache:list failed", a), [];
  }
});
i.handle("cache:get-size", async () => {
  try {
    const t = ee();
    let e = 0;
    if (l.existsSync(p))
      for (const o of l.readdirSync(p))
        e += J(r.join(p, o));
    for (const o of te())
      o.localPath && (e += J(r.join(t, o.localPath)));
    return e;
  } catch (t) {
    return console.error("[Main] cache:get-size failed", t), 0;
  }
});
i.handle("cache:clear", async () => {
  try {
    const t = ee();
    for (const e of te()) {
      if (!e.localPath) continue;
      const o = r.join(t, e.localPath);
      if (l.existsSync(o))
        try {
          l.unlinkSync(o), he(o, t);
        } catch (a) {
          console.warn(`[Main] Failed to remove cached audio ${o}`, a);
        }
    }
    if (l.existsSync(p))
      for (const e of l.readdirSync(p))
        try {
          l.unlinkSync(r.join(p, e));
        } catch (o) {
          console.warn(`[Main] Failed to remove cache file ${e}`, o);
        }
    return !0;
  } catch (t) {
    return console.error("[Main] cache:clear failed", t), !1;
  }
});
let j = "";
i.on("settings:update-download-path", (t, e) => {
  j = e;
});
const _ = r.dirname(ce(import.meta.url));
process.env.DIST = r.join(_, "../dist");
process.env.VITE_PUBLIC = u.isPackaged ? process.env.DIST : r.join(process.env.DIST, "../public");
let n = null, h = null, m = null, Y = null, U = null, q = null, k = null, x = null, g = {
  isPlaying: !1,
  track: null
}, oe = !0, ne = !1;
function re(t = !0) {
  const e = g.isPlaying ? "pause.png" : "play.png";
  if (U) {
    const d = M.createFromPath(r.join(process.env.VITE_PUBLIC, e)).resize({ width: 18, height: 18 });
    process.platform === "darwin" && d.setTemplateImage(!0), U.setImage(d);
  }
  process.platform === "darwin" && t && (g.track ? x?.setTitle(`${g.track.name} - ${g.track.artist}`) : x?.setTitle(""));
  const o = [];
  g.track && o.push(
    { label: `♫ ${g.track.name}`, enabled: !1 },
    { label: `   ${g.track.artist}`, enabled: !1 },
    { type: "separator" },
    { label: "⏮ 上一曲", click: () => n?.webContents.send("player:prev") },
    {
      label: g.isPlaying ? "⏸ 暂停" : "▶️ 播放",
      click: () => n?.webContents.send("player:toggle")
    },
    { label: "⏭ 下一曲", click: () => n?.webContents.send("player:next") },
    { type: "separator" }
  ), o.push(
    { label: "打开播放器", click: () => n?.show() },
    { label: "退出", click: () => u.quit() }
  );
  const a = F.buildFromTemplate(o);
  k?.setContextMenu(a);
}
function ye() {
  const t = process.platform === "darwin", e = [
    ...t ? [
      {
        label: u.name,
        submenu: [
          { role: "about", label: `关于 ${u.name}` },
          { type: "separator" },
          { role: "services", label: "服务" },
          { type: "separator" },
          { role: "hide", label: `隐藏 ${u.name}` },
          { role: "hideOthers", label: "隐藏其他" },
          { role: "unhide", label: "显示全部" },
          { type: "separator" },
          { role: "quit", label: `退出 ${u.name}` }
        ]
      }
    ] : [],
    {
      label: "文件",
      submenu: [t ? { role: "close", label: "关闭窗口" } : { role: "quit", label: "退出" }]
    },
    {
      label: "编辑",
      submenu: [
        { role: "undo", label: "撤销" },
        { role: "redo", label: "重做" },
        { type: "separator" },
        { role: "cut", label: "剪切" },
        { role: "copy", label: "复制" },
        { role: "paste", label: "粘贴" },
        ...t ? [
          { role: "pasteAndMatchStyle", label: "粘贴并匹配样式" },
          { role: "delete", label: "删除" },
          { role: "selectAll", label: "全选" },
          { type: "separator" },
          {
            label: "演讲",
            submenu: [
              { role: "startSpeaking", label: "开始朗读" },
              { role: "stopSpeaking", label: "停止朗读" }
            ]
          }
        ] : [
          { role: "delete", label: "删除" },
          { type: "separator" },
          { role: "selectAll", label: "全选" }
        ]
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "forceReload", label: "强制重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "实际大小" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        { role: "togglefullscreen", label: "切换全屏" }
      ]
    },
    {
      label: "窗口",
      submenu: [
        { role: "minimize", label: "最小化" },
        { role: "zoom", label: "缩放" },
        ...t ? [
          { type: "separator" },
          { role: "front", label: "前置全部窗口" },
          { type: "separator" },
          { role: "window", label: "窗口" }
        ] : [
          { role: "close", label: "关闭" }
        ]
      ]
    },
    {
      role: "help",
      label: "帮助",
      submenu: [
        {
          label: "项目主页",
          click: async () => {
            await R.openExternal("https://www.audiodock.cn");
          }
        },
        {
          label: "查看文档",
          click: async () => {
            await R.openExternal("https://www.audiodock.cn/docs");
          }
        },
        {
          label: "报告问题",
          click: async () => {
            await R.openExternal("https://github.com/mmdctjj/AudioDock/issues");
          }
        }
      ]
    }
  ], o = F.buildFromTemplate(e);
  F.setApplicationMenu(o);
}
i.on("player:update", (t, e) => {
  g = { ...g, ...e };
  const o = e.track !== void 0;
  re(o), h?.webContents.send("player:update", e), m?.webContents.send("player:update", e);
});
i.on("settings:update-minimize-to-tray", (t, e) => {
  oe = e;
});
i.on("lyric:update", (t, e) => {
  const { currentLyric: o } = e;
  if (process.platform === "darwin") {
    const a = o || (g.track ? `${g.track.name} - ${g.track.artist}` : "");
    x?.setTitle(a);
  }
  h?.webContents.send("lyric:update", e), m?.webContents.send("lyric:update", e);
});
i.on("lyric:settings-update", (t, e) => {
  h?.webContents.send("lyric:settings-update", e);
});
i.on("lyric:open", (t, e) => {
  ge(e);
});
i.on("lyric:toggle", () => {
  n && n.webContents.send("lyric:toggle");
});
i.on("lyric:close", () => {
  h && (h.close(), h = null);
});
i.on("lyric:set-mouse-ignore", (t, e) => {
  h?.setIgnoreMouseEvents(e, { forward: !0 });
});
i.on("player:toggle", () => {
  console.log("Main process: received player:toggle"), n ? (console.log("Main process: forwarding player:toggle to main window"), n.webContents.send("player:toggle")) : console.warn("Main process: win is null, cannot forward player:toggle");
});
i.on("player:next", () => {
  console.log("Main process: received player:next"), n?.webContents.send("player:next");
});
i.on("player:prev", () => {
  n?.webContents.send("player:prev");
});
i.on("player:seek", (t, e) => {
  n?.webContents.send("player:seek", e);
});
i.on("window:set-mini", () => {
  n && (n.hide(), we());
});
i.on("window:minimize", () => {
  n?.minimize();
});
i.on("window:maximize", () => {
  n?.isMaximized() ? n?.unmaximize() : n?.maximize();
});
i.on("window:close", () => {
  n?.close();
});
i.on("window:restore-main", () => {
  m && (m.close(), m = null), n && (n.show(), n.center());
});
i.on("app:show-main", () => {
  n && (n.isVisible() ? n.focus() : n.show());
});
i.on("window:set-always-on-top", (t, e) => {
  m && m.setAlwaysOnTop(e, "floating");
});
function we() {
  if (m) {
    m.show();
    return;
  }
  m = new L({
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
    vibrancy: "popover",
    visualEffectState: "active",
    webPreferences: {
      contextIsolation: !0,
      nodeIntegration: !1,
      preload: r.join(_, "preload.mjs")
    }
  });
  const t = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/mini` : "app://./index.html#/mini";
  process.env.VITE_DEV_SERVER_URL, m.loadURL(t), process.platform === "darwin" && (m.setAlwaysOnTop(!0, "floating"), m.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 })), m.on("closed", () => {
    m = null;
  });
}
function ae() {
  n = new L({
    icon: r.join(process.env.VITE_PUBLIC, "logo.png"),
    titleBarStyle: "hidden",
    ...process.platform !== "win32" ? {
      titleBarOverlay: {
        color: "rgba(0,0,0,0)",
        symbolColor: G(),
        height: 30
      }
    } : {},
    width: 1020,
    // 初始宽度
    height: 700,
    // 初始高度
    minWidth: 1025,
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
      preload: r.join(_, "preload.mjs")
    }
  }), n.on("close", (t) => (!ne && oe && (t.preventDefault(), n?.hide()), !1)), process.env.VITE_DEV_SERVER_URL ? n.loadURL(process.env.VITE_DEV_SERVER_URL) : n.loadURL("app://./index.html");
}
function ge(t) {
  if (h) return;
  const { width: e, height: o } = se.getPrimaryDisplay().workAreaSize, a = 800, d = 120, b = t?.x !== void 0 ? t.x : Math.floor((e - a) / 2), s = t?.y !== void 0 ? t.y : o - d - 50;
  h = new L({
    width: a,
    height: d,
    x: b,
    y: s,
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
      preload: r.join(_, "preload.mjs")
    }
  });
  const y = process.env.VITE_DEV_SERVER_URL ? `${process.env.VITE_DEV_SERVER_URL}#/lyric` : `${r.join(process.env.DIST, "index.html")}#/lyric`;
  process.env.VITE_DEV_SERVER_URL ? h.loadURL(y) : h.loadURL("app://./index.html#/lyric"), process.platform === "darwin" && (h.setAlwaysOnTop(!0, "screen-saver"), h.setVisibleOnAllWorkspaces(!0, { visibleOnFullScreen: !0 }));
  let c = null;
  h.on("move", () => {
    c && clearTimeout(c), c = setTimeout(() => {
      if (h && n) {
        const [f, v] = h.getPosition();
        n.webContents.send("lyric:position-updated", { x: f, y: v });
      }
    }, 500);
  }), h.on("closed", () => {
    h = null;
  });
}
function be() {
  const t = (e, o = 20) => {
    let a = M.createFromPath(r.join(process.env.VITE_PUBLIC, e));
    return a = a.resize({ width: o, height: o }), process.platform === "darwin" && a.setTemplateImage(!0), a;
  };
  if (process.platform === "darwin") {
    const e = M.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=");
    x = new T(e), x.on("click", () => {
      n?.webContents.send("lyric:toggle");
    }), q = new T(t("next.png")), U = new T(t("play.png")), Y = new T(t("previous.png")), k = new T(t("mini_logo.png")), q.on("click", () => n?.webContents.send("player:next")), U.on("click", () => n?.webContents.send("player:toggle")), Y.on("click", () => n?.webContents.send("player:prev"));
  } else {
    const e = M.createFromPath(r.join(process.env.VITE_PUBLIC, "logo.png")).resize({ width: 24, height: 24 });
    k = new T(e), k.setToolTip("AudioDock");
  }
  k.on("click", () => {
    n && (n.isVisible() ? n.focus() : n.show());
  }), re();
}
u.on("before-quit", () => {
  ne = !0;
});
V.registerSchemesAsPrivileged([
  {
    scheme: "app",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      bypassCSP: !1,
      corsEnabled: !0
    }
  },
  {
    scheme: "media",
    privileges: {
      standard: !0,
      secure: !0,
      supportFetchAPI: !0,
      bypassCSP: !0,
      corsEnabled: !0,
      // often needed for media elements
      stream: !0
    }
  }
]);
u.whenReady().then(() => {
  console.log("[Main] App is ready."), process.platform === "darwin" && u.setAboutPanelOptions({
    applicationName: "AudioDock",
    applicationVersion: u.getVersion(),
    version: u.getVersion(),
    copyright: "Copyright © 2026 北京声仓科技有限公司",
    website: "https://www.audiodock.cn",
    iconPath: r.join(process.env.VITE_PUBLIC, "logo.png")
  }), console.log(`[Main] CACHE_DIR set to: ${p}`), console.log(`[Main] Initial Download Path: ${j || "Default (app/downloads)"}`), V.handle("app", (t) => {
    try {
      const e = new URL(t.url);
      let o = decodeURIComponent(e.pathname);
      o.startsWith("/") && (o = o.slice(1));
      const a = r.join(process.env.DIST, o || "index.html");
      return console.log(`[Main] App Protocol: url=${t.url} -> filePath=${a}`), $.fetch(H(a).href);
    } catch (e) {
      return console.error("[Main] App protocol error:", e), new Response("Internal error", { status: 500 });
    }
  }), V.handle("media", async (t) => {
    try {
      const e = new URL(t.url), o = e.host;
      let a = e.pathname;
      a.startsWith("/") && (a = a.slice(1));
      const d = decodeURIComponent(a);
      let s = ((w, A) => {
        if (w === "audio") {
          const C = j || r.join(u.getPath("userData"), "downloads");
          return r.join(C.replace(/^~/, P.homedir()), A);
        } else {
          if (w === "cover" || w === "metadata")
            return r.join(p, A);
          {
            const C = j || r.join(u.getPath("userData"), "audio_cache");
            return r.join(C.replace(/^~/, P.homedir()), w, A);
          }
        }
      })(o, d);
      if (!l.existsSync(s)) {
        const w = r.join(p, d || o);
        l.existsSync(w) && (console.log(`[Main] File found via CACHEFallback: ${w}`), s = w);
      }
      const y = l.existsSync(s);
      if (console.log(`[Main] Media Protocol: url=${t.url} -> host=${o}, path=${d} -> filePath=${s} (exists: ${y})`), !y)
        return new Response("File Not Found", { status: 404 });
      const c = r.extname(s).toLowerCase();
      let f = "application/octet-stream";
      if (c === ".jpg" || c === ".jpeg" ? f = "image/jpeg" : c === ".png" ? f = "image/png" : c === ".mp3" ? f = "audio/mpeg" : c === ".flac" ? f = "audio/flac" : c === ".wav" ? f = "audio/wav" : c === ".aac" ? f = "audio/aac" : c === ".json" && (f = "application/json"), c === ".m4a") {
        if (await ue(s) === "alac") {
          console.log(`[Main] Detected ALAC codec for ${s}, transcoding to WAV...`);
          const A = Q("ffmpeg", ["-i", s, "-f", "wav", "-"]);
          return new Response(X.toWeb(A.stdout), {
            headers: {
              "Content-Type": "audio/wav",
              "Access-Control-Allow-Origin": "*",
              "Cache-Control": "no-cache"
            }
          });
        }
        f = "audio/mp4";
      }
      if (o === "cover" || o === "metadata" || c === ".json" || c === ".jpeg" || c === ".jpg" || c === ".png") {
        const w = l.readFileSync(s);
        return new Response(new Uint8Array(w), {
          headers: {
            "Content-Type": f,
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache"
          }
        });
      }
      const v = H(s).href, S = await $.fetch(v);
      return new Response(S.body, {
        status: S.status,
        statusText: S.statusText,
        headers: {
          "Content-Type": f,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache"
        }
      });
    } catch (e) {
      return console.error("[Main] Protocol handle error:", e), new Response("Internal error", { status: 500 });
    }
  }), ae(), Z(), be(), ye();
});
u.on("window-all-closed", () => {
  process.platform !== "darwin" && u.quit();
});
u.on("activate", () => {
  L.getAllWindows().length === 0 ? ae() : n?.show();
});
K.on("updated", Z);
