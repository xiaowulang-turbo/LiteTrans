import { app, ipcMain, clipboard, nativeImage, shell, BrowserWindow, screen } from 'electron'
import path from 'path'

import { createMainWindow, mainWindow, showAndFocusWindow } from './modules/window'
import { createPreviewWindow, previewWindow } from './modules/preview-window'
import { captureScreen, setupScreenshotIPC } from './modules/screenshot'
import { registerShortcuts, updateShortcut, getCurrentShortcut, PRESET_SHORTCUTS, unregisterAllShortcuts } from './modules/shortcut'
import { createTray } from './modules/tray'
import { checkForUpdates } from './modules/update'
import { getCachedImage, saveImageToCache } from './modules/cache'
import { checkAppVersionOnStartup, notifyVersionBlocked, setupVersionControlIPC } from './modules/version-control'

const isDev = !app.isPackaged
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

function setupIPC() {
  setupScreenshotIPC(mainWindow)

  ipcMain.on('capture-screen', () => captureScreen(mainWindow, process.platform))

  ipcMain.on('copy-image', (_event, base64: string) => {
    const image = nativeImage.createFromBuffer(Buffer.from(base64, 'base64'))
    clipboard.writeImage(image)
  })

  ipcMain.on('close-window', () => {
    mainWindow?.hide()
  })

  ipcMain.on('minimize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.minimize()
  })

  ipcMain.on('maximize-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })

  ipcMain.handle('toggle-always-on-top', (_event, windowType: 'main' | 'preview') => {
    const win = windowType === 'preview' ? previewWindow : mainWindow
    if (!win) return false
    const newState = !win.isAlwaysOnTop()
    win.setAlwaysOnTop(newState)
    return newState
  })

  ipcMain.handle('get-always-on-top', (_event, windowType: 'main' | 'preview') => {
    const win = windowType === 'preview' ? previewWindow : mainWindow
    return win?.isAlwaysOnTop() ?? false
  })

  ipcMain.on('resize-preview-window', (_event, width: number, height: number) => {
    if (!previewWindow || previewWindow.isDestroyed()) return
    const display = screen.getPrimaryDisplay()
    const maxWidth = Math.floor(display.workAreaSize.width * 0.9)
    const maxHeight = Math.floor(display.workAreaSize.height * 0.9)
    const minWidth = 300
    const minHeight = 200
    const finalWidth = Math.max(minWidth, Math.min(width, maxWidth))
    const finalHeight = Math.max(minHeight, Math.min(height, maxHeight))
    previewWindow.setSize(finalWidth, finalHeight)
    previewWindow.center()
  })

  ipcMain.on('open-external', (_event, url: string) => {
    shell.openExternal(url)
  })

  ipcMain.handle('get-shortcut', () => {
    return getCurrentShortcut()
  })

  ipcMain.handle('set-shortcut', (_event, shortcut: string) => {
    return updateShortcut(shortcut, () => captureScreen(mainWindow, process.platform))
  })

  ipcMain.handle('get-preset-shortcuts', () => {
    return PRESET_SHORTCUTS
  })

  ipcMain.handle('check-for-updates', async () => {
    return checkForUpdates()
  })

  ipcMain.on('open-releases-page', async () => {
    const info = await checkForUpdates()
    shell.openExternal(info.releaseUrl)
  })

  ipcMain.on('open-preview', (_event, base64: string) => {
    createPreviewWindow(base64)
  })

  ipcMain.handle('get-cached-image', (_event, storagePath: string) => {
    return getCachedImage(storagePath)
  })

  ipcMain.handle('save-image-to-cache', (_event, url: string, storagePath: string) => {
    return saveImageToCache(url, storagePath)
  })

  // 版本控制 IPC
  ipcMain.on('get-app-version', (event) => {
    event.returnValue = app.getVersion()
  })
}

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
    showAndFocusWindow(mainWindow)
  })
}

app.whenReady().then(async () => {
  // 1. 首先检查版本，如被阻止则直接退出
  const allowed = await checkAppVersionOnStartup()
  if (!allowed) {
    return
  }

  createMainWindow()

  createTray(
    () => captureScreen(mainWindow, process.platform),
    () => showAndFocusWindow(mainWindow),
    () => app.quit()
  )

  registerShortcuts(
    () => captureScreen(mainWindow, process.platform),
    () => showAndFocusWindow(mainWindow)
  )

  setupIPC()
  setupVersionControlIPC()

  if (!isDev) {
    setTimeout(async () => {
      const info = await checkForUpdates()
      if (info.hasUpdate) {
        mainWindow?.webContents.send('update-available', info)
      }
    }, 3000)
  }
})

app.on('will-quit', () => {
  unregisterAllShortcuts()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
