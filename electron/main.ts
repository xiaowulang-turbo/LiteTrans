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
let previewWindow: BrowserWindow | null = null
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

  // 显示主窗口快捷键
  if (!globalShortcut.register('Alt+Shift+Q', () => {
    mainWindow?.show()
  })) {
    console.error('[registerShortcuts] failed to register Alt+Shift+T')
  }
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
  const { screen } = require('electron')
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
  return currentShortcut
})

ipcMain.handle('set-shortcut', (_event, shortcut: string) => {
  return updateShortcut(shortcut)
})

ipcMain.handle('get-preset-shortcuts', () => {
  return PRESET_SHORTCUTS
})

ipcMain.on('open-preview', (_event, base64: string) => {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.webContents.send('preview-image', base64)
    previewWindow.show()
    return
  }

  previewWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const previewHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          width: 100%; height: 100%; 
          background: rgba(0,0,0,0.95);
          overflow: hidden;
        }
        .container {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
        }
        .header {
          height: 32px; 
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 12px;
          -webkit-app-region: drag;
        }
        .header span { color: rgba(255,255,255,0.6); font-size: 12px; }
        .header button {
          -webkit-app-region: no-drag;
          border: none; cursor: pointer;
        }
        .header-left {
          display: flex; align-items: center; gap: 8px;
          -webkit-app-region: no-drag;
        }
        .traffic-btn {
          width: 12px; height: 12px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; color: rgba(0,0,0,0.6);
          transition: all 0.2s;
        }
        .traffic-btn span { opacity: 0; font-weight: bold; }
        .traffic-btn:hover span { opacity: 1; }
        .close-btn { background: #ff5f57; }
        .close-btn:hover { background: #ff7b72; }
        .minimize-btn { background: #febc2e; }
        .minimize-btn:hover { background: #fec84a; }
        .maximize-btn { background: #28c840; }
        .maximize-btn:hover { background: #3dd656; }
        .header-right {
          display: flex; align-items: center; gap: 8px;
          -webkit-app-region: no-drag;
        }
        .pin-btn {
          width: auto; height: auto; border-radius: 0;
          background: transparent; font-size: 12px;
          cursor: pointer; transition: all 0.2s;
        }
        .pin-btn.active { filter: none; }
        .pin-btn.inactive { filter: grayscale(1); opacity: 0.5; }
        .pin-btn:hover { opacity: 1; }
        .image-area {
          flex: 1; overflow: auto; padding: 16px;
          display: flex; align-items: flex-start; justify-content: center;
        }
        .image-area img { max-width: none; border-radius: 8px; }
        .footer {
          padding: 12px; display: flex; justify-content: center; gap: 12px;
        }
        .footer button {
          padding: 8px 24px; border-radius: 20px; border: none;
          font-size: 13px; cursor: pointer; transition: all 0.2s;
        }
        .copy-btn { background: rgba(59,130,246,0.8); color: white; }
        .copy-btn:hover { background: rgba(59,130,246,1); }
        .close-footer-btn { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); }
        .close-footer-btn:hover { background: rgba(255,255,255,0.2); }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-left">
            <button class="traffic-btn close-btn" onclick="window.close()" title="关闭"><span>×</span></button>
            <button class="traffic-btn minimize-btn" id="minimize-btn" title="最小化"><span>−</span></button>
            <button class="traffic-btn maximize-btn" id="maximize-btn" title="最大化"><span>+</span></button>
          </div>
          <span>图片预览 (ESC 关闭)</span>
          <div class="header-right">
            <button class="pin-btn inactive" id="pin-btn" title="窗口置顶">📌</button>
          </div>
        </div>
        <div class="image-area">
          <img id="preview-img" src="" alt="预览">
        </div>
        <div class="footer">
          <button class="copy-btn" id="copy-btn">复制图片</button>
          <button class="close-footer-btn" onclick="window.close()">关闭</button>
        </div>
      </div>
      <script>
        let currentImageData = '';
        let isUrl = false;
        let isPinned = false;
        const HEADER_HEIGHT = 32;
        const FOOTER_HEIGHT = 56;
        const PADDING = 32;
        window.electronAPI?.onPreviewImage?.((imageData) => {
          currentImageData = imageData;
          isUrl = imageData.startsWith('http://') || imageData.startsWith('https://');
          const src = isUrl ? imageData : (imageData.startsWith('data:') ? imageData : 'data:image/png;base64,' + imageData);
          const img = document.getElementById('preview-img');
          img.onload = () => {
            const imgWidth = img.naturalWidth;
            const imgHeight = img.naturalHeight;
            const windowWidth = imgWidth + PADDING;
            const windowHeight = imgHeight + HEADER_HEIGHT + FOOTER_HEIGHT + PADDING;
            window.electronAPI?.resizePreviewWindow?.(windowWidth, windowHeight);
          };
          img.src = src;
        });
        document.getElementById('minimize-btn').onclick = () => {
          window.electronAPI?.minimizeWindow?.();
        };
        document.getElementById('maximize-btn').onclick = () => {
          window.electronAPI?.maximizeWindow?.();
        };
        document.getElementById('pin-btn').onclick = async () => {
          const newState = await window.electronAPI?.toggleAlwaysOnTop?.('preview');
          isPinned = newState;
          const btn = document.getElementById('pin-btn');
          btn.className = 'pin-btn ' + (isPinned ? 'active' : 'inactive');
          btn.title = isPinned ? '取消置顶' : '窗口置顶';
        };
        document.getElementById('copy-btn').onclick = async () => {
          if (!currentImageData) return;
          try {
            if (isUrl) {
              const res = await fetch(currentImageData);
              const blob = await res.blob();
              const reader = new FileReader();
              reader.onload = () => {
                const b64 = reader.result.split(',')[1];
                window.electronAPI?.copyImage?.(b64);
                document.getElementById('copy-btn').textContent = '已复制 ✓';
                setTimeout(() => document.getElementById('copy-btn').textContent = '复制图片', 1500);
              };
              reader.readAsDataURL(blob);
            } else {
              const b64 = currentImageData.startsWith('data:') ? currentImageData.split(',')[1] : currentImageData;
              window.electronAPI?.copyImage?.(b64);
              document.getElementById('copy-btn').textContent = '已复制 ✓';
              setTimeout(() => document.getElementById('copy-btn').textContent = '复制图片', 1500);
            }
          } catch (e) {
            console.error('Copy failed:', e);
          }
        };
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') window.close();
        });
      </script>
    </body>
    </html>
  `

  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml))

  previewWindow.once('ready-to-show', () => {
    previewWindow?.webContents.send('preview-image', base64)
    previewWindow?.show()
  })

  previewWindow.on('closed', () => {
    previewWindow = null
  })
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
