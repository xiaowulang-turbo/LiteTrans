import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard,
  nativeImage,
  Tray,
  Menu,
  shell,
} from 'electron'
import path from 'path'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'

const isDev = !app.isPackaged

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentShortcut: string = 'Alt+Q'

const TEMP_SCREENSHOT_PATH = path.join(os.tmpdir(), 'litetrans_screenshot.png')

const PRESET_SHORTCUTS = ['Alt+Q', 'Alt+T', 'Alt+S', 'CommandOrControl+Shift+T', 'CommandOrControl+Shift+S']

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig(): { shortcut: string } {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { shortcut: data.shortcut || 'Alt+Q' }
    }
  } catch (e) {
    console.error('[loadConfig] error:', e)
  }
  return { shortcut: 'Alt+Q' }
}

function saveConfig(config: { shortcut: string }) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('[saveConfig] error:', e)
  }
}
const PROTOCOL_NAME = 'litetrans'

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME)
}

function handleOAuthCallback(url: string) {
  console.log('[handleOAuthCallback] received url:', url)
  const urlObj = new URL(url)
  console.log('[handleOAuthCallback] protocol:', urlObj.protocol, 'host:', urlObj.host)
  if (urlObj.protocol === `${PROTOCOL_NAME}:` && urlObj.host === 'auth') {
    console.log('[handleOAuthCallback] sending to renderer')
    mainWindow?.show()
    mainWindow?.webContents.send('oauth-callback', url)
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 500,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('blur', () => {
    // 失焦时可选择隐藏窗口
  })
}

function createTray() {
  const trayIconPath = isDev
    ? path.join(app.getAppPath(), 'build/trayIcon.png')
    : path.join(process.resourcesPath, 'trayIcon.png')
  const icon = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('LiteTrans - 截图即译')

  const contextMenu = Menu.buildFromTemplate([
    { label: '截图翻译', click: captureScreen },
    { label: '显示窗口', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])

  tray.setContextMenu(contextMenu)
}

function registerShortcuts() {
  const config = loadConfig()
  currentShortcut = config.shortcut
  
  if (!globalShortcut.register(currentShortcut, captureScreen)) {
    console.error('[registerShortcuts] failed to register:', currentShortcut)
    if (currentShortcut !== 'Alt+Q') {
      currentShortcut = 'Alt+Q'
      globalShortcut.register(currentShortcut, captureScreen)
    }
  }
  console.log('[registerShortcuts] registered:', currentShortcut)
}

function updateShortcut(newShortcut: string): { success: boolean; shortcut: string } {
  if (!PRESET_SHORTCUTS.includes(newShortcut)) {
    return { success: false, shortcut: currentShortcut }
  }
  
  globalShortcut.unregister(currentShortcut)
  
  if (globalShortcut.register(newShortcut, captureScreen)) {
    currentShortcut = newShortcut
    saveConfig({ shortcut: newShortcut })
    console.log('[updateShortcut] updated to:', newShortcut)
    return { success: true, shortcut: newShortcut }
  }
  
  globalShortcut.register(currentShortcut, captureScreen)
  console.error('[updateShortcut] failed to register:', newShortcut)
  return { success: false, shortcut: currentShortcut }
}

async function captureScreen() {
  mainWindow?.hide()

  exec(`screencapture -i "${TEMP_SCREENSHOT_PATH}"`, async (error) => {
    if (error) {
      mainWindow?.webContents.send('translate-error', '截图失败')
      mainWindow?.show()
      return
    }

    if (!fs.existsSync(TEMP_SCREENSHOT_PATH)) {
      return
    }

    mainWindow?.show()

    try {
      const imageBuffer = fs.readFileSync(TEMP_SCREENSHOT_PATH)
      fs.unlinkSync(TEMP_SCREENSHOT_PATH)
      const base64Image = imageBuffer.toString('base64')
      mainWindow?.webContents.send('screenshot-captured', base64Image)
    } catch (err) {
      const error = err as Error
      mainWindow?.webContents.send('translate-error', error.message)
    }
  })
}

ipcMain.on('capture-screen', captureScreen)

ipcMain.on('copy-image', (_event, base64: string) => {
  const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
  clipboard.writeImage(image)
})

ipcMain.on('close-window', () => {
  mainWindow?.hide()
})

ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('get-auto-launch', () => {
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('set-auto-launch', (_event, enabled: boolean) => {
  app.setLoginItemSettings({ openAtLogin: enabled })
  return app.getLoginItemSettings().openAtLogin
})

ipcMain.handle('get-shortcut', () => {
  return currentShortcut
})

ipcMain.handle('set-shortcut', (_event, shortcut: string) => {
  return updateShortcut(shortcut)
})

ipcMain.handle('get-preset-shortcuts', () => {
  return PRESET_SHORTCUTS
})

app.on('open-url', (_event, url) => {
  handleOAuthCallback(url)
})

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (_event, argv) => {
    const url = argv.find(arg => arg.startsWith(`${PROTOCOL_NAME}://`))
    if (url) handleOAuthCallback(url)
    mainWindow?.show()
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerShortcuts()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
