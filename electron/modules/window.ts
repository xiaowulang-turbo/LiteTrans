import { BrowserWindow, app } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

export let mainWindow: BrowserWindow | null = null

export function createMainWindow(): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 500,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
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

  return mainWindow
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

/**
 * 显示窗口并确保获得焦点（置于前台）
 * 解决 macOS 上 show() 不保证窗口激活的问题
 */
export function showAndFocusWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return

  win.show()
  win.focus()

  // macOS 需要额外处理才能确保应用激活到前台
  if (process.platform === 'darwin') {
    app.focus({ steal: true })
  }
}
