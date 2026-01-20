import {
  app,
  BrowserWindow,
  globalShortcut,
  ipcMain,
  clipboard,
  nativeImage,
  Tray,
  Menu,
} from 'electron'
import path from 'path'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'
import { translateImage } from './baidu-api'
import { loadConfig, saveConfig, isConfigValid, SUPPORTED_LANGS, AppConfig } from './config'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let currentConfig: AppConfig

const TEMP_SCREENSHOT_PATH = path.join(os.tmpdir(), 'litetrans_screenshot.png')

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
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.NODE_ENV === 'development') {
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

    mainWindow?.webContents.send('translate-start')
    mainWindow?.show()

    try {
      const imageBuffer = fs.readFileSync(TEMP_SCREENSHOT_PATH)
      fs.unlinkSync(TEMP_SCREENSHOT_PATH)

      if (!isConfigValid(currentConfig)) {
        mainWindow?.webContents.send('translate-error', '请先在设置中配置百度 API 凭证')
        return
      }

      const result = await translateImage(
        imageBuffer,
        { appid: currentConfig.appid, secret: currentConfig.secret },
        { from: currentConfig.fromLang, to: currentConfig.toLang }
      )

      if (result.error_code === '0' && result.data) {
        mainWindow?.webContents.send('translate-result', {
          image: result.data.pasteImg,
          sumSrc: result.data.sumSrc,
          sumDst: result.data.sumDst,
        })
      } else {
        mainWindow?.webContents.send('translate-error', result.error_msg || '翻译失败')
      }
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

ipcMain.handle('get-config', () => {
  return currentConfig
})

ipcMain.handle('save-config', (_event, config: Partial<AppConfig>) => {
  currentConfig = saveConfig(config)
  return currentConfig
})

ipcMain.handle('get-supported-langs', () => {
  return SUPPORTED_LANGS
})

app.whenReady().then(() => {
  currentConfig = loadConfig()
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
