import { app as n, BrowserWindow as s } from "electron";
import t from "path";
import { fileURLToPath as c } from "node:url";
const a = t.dirname(c(import.meta.url));
process.env.DIST = t.join(a, "../dist");
process.env.VITE_PUBLIC = n.isPackaged ? process.env.DIST : t.join(process.env.DIST, "../public");
let e;
const i = process.env.VITE_DEV_SERVER_URL;
function l() {
  e = new s({
    icon: t.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
    titleBarStyle: "hidden",
    // Enable native window controls on Windows (Minimize, Maximize, Close)
    titleBarOverlay: {
      color: "rgba(0,0,0,0)",
      // Transparent background
      symbolColor: "#ffffff",
      // White symbols
      height: 30
    },
    resizable: !0,
    maximizable: !0,
    transparent: process.platform === "darwin",
    // Transparency works best on macOS
    opacity: 0.95,
    // Window opacity (0.0 - 1.0), adjust as needed
    vibrancy: "popover",
    // macOS vibrancy effect
    visualEffectState: "active",
    // Keep vibrancy always active
    webPreferences: {
      preload: t.join(a, "preload.js")
    }
  }), e.webContents.on("did-finish-load", () => {
    e?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), i ? e.loadURL(i) : e.loadFile(t.join(process.env.DIST, "index.html")), e.webContents.on("before-input-event", (r, o) => {
    (o.key === "i" || o.key === "I") && (process.platform === "darwin" ? o.meta && o.alt && (e?.webContents.toggleDevTools(), r.preventDefault()) : o.control && o.shift && (e?.webContents.toggleDevTools(), r.preventDefault()));
  });
}
n.on("window-all-closed", () => {
  process.platform !== "darwin" && (n.quit(), e = null);
});
n.on("activate", () => {
  s.getAllWindows().length === 0 && l();
});
n.whenReady().then(l);
