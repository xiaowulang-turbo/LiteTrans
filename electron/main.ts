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

const TEMP_SCREENSHOT_PATH = path.join(os.tmpdir(), 'litetrans_screenshot.png')
const PROTOCOL_NAME = 'litetrans'

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL_NAME, process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient(PROTOCOL_NAME)
}

function handleOAuthCallback(url: string) {
  const urlObj = new URL(url)
  if (urlObj.protocol === `${PROTOCOL_NAME}:` && urlObj.host === 'auth') {
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
  // 使用简单的图标占位，实际可替换为真实图标
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)
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
  globalShortcut.register('Alt+Q', captureScreen)
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
