import { app as t, BrowserWindow as i } from "electron";
import n from "path";
import { fileURLToPath as c } from "node:url";
const a = n.dirname(c(import.meta.url));
process.env.DIST = n.join(a, "../dist");
process.env.VITE_PUBLIC = t.isPackaged ? process.env.DIST : n.join(process.env.DIST, "../public");
let e;
const s = process.env.VITE_DEV_SERVER_URL;
function l() {
  e = new i({
    icon: n.join(process.env.VITE_PUBLIC || "", "electron-vite.svg"),
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
      preload: n.join(a, "preload.js")
    }
  }), e.webContents.on("did-finish-load", () => {
    e?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), s ? e.loadURL(s) : e.loadFile(n.join(process.env.DIST, "index.html")), e.webContents.on("before-input-event", (r, o) => {
    (o.key === "i" || o.key === "I") && (process.platform === "darwin" ? o.meta && o.alt && (e?.webContents.toggleDevTools(), r.preventDefault()) : o.control && o.shift && (e?.webContents.toggleDevTools(), r.preventDefault()));
  });
}
t.on("window-all-closed", () => {
  process.platform !== "darwin" && (t.quit(), e = null);
});
t.on("activate", () => {
  i.getAllWindows().length === 0 && l();
});
t.whenReady().then(l);
