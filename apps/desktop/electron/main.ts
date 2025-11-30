import { app, BrowserWindow } from 'electron'
import path from 'path'

import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// In development: __dirname is in electron/, dist is at ../dist
// In production: __dirname is in dist-electron/, dist is at ../dist (sibling directory)
// Both cases use the same relative path, but we need to ensure it resolves correctly
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    titleBarStyle: 'hidden',
    // Enable native window controls on Windows (Minimize, Maximize, Close)
    titleBarOverlay: {
      color: 'rgba(0,0,0,0)', // Transparent background
      symbolColor: '#ffffff', // White symbols
      height: 30
    },
    resizable: true,
    maximizable: true,
    transparent: process.platform === 'darwin', // Transparency works best on macOS
    opacity: 0.95, // Window opacity (0.0 - 1.0), adjust as needed
    vibrancy: 'popover', // macOS vibrancy effect
    visualEffectState: 'active', // Keep vibrancy always active
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(process.env.DIST!, 'index.html'))
  }

  // Add keyboard shortcut to open DevTools (Cmd+Option+I on Mac, Ctrl+Shift+I on Windows/Linux)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'i' || input.key === 'I') {
      if (process.platform === 'darwin') {
        // Mac: Cmd+Option+I
        if (input.meta && input.alt) {
          win?.webContents.toggleDevTools()
          event.preventDefault()
        }
      } else {
        // Windows/Linux: Ctrl+Shift+I
        if (input.control && input.shift) {
          win?.webContents.toggleDevTools()
          event.preventDefault()
        }
      }
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
