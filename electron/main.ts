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
  desktopCapturer,
  screen,
} from 'electron'
import path from 'path'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'

const isDev = !app.isPackaged

// === 版本更新检查 ===
interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

const GITHUB_OWNER = 'ArcMichael'
const GITHUB_REPO = 'LiteTrans'

function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [a, b] = [normalize(v1), normalize(v2)]
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1
    if ((a[i] || 0) < (b[i] || 0)) return -1
  }
  return 0
}

async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'LiteTrans' } }
    )
    if (!response.ok) throw new Error('Failed to fetch release info')

    const data = await response.json()
    const latestVersion = (data.tag_name || '') as string
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion.replace(/^v/, ''),
      releaseUrl: data.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
    }
  } catch (err) {
    console.error('[checkForUpdates] error:', err)
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      releaseNotes: '',
      publishedAt: '',
    }
  }
}

let mainWindow: BrowserWindow | null = null
let previewWindow: BrowserWindow | null = null
let screenshotOverlayWindow: BrowserWindow | null = null
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

  if (process.platform === 'win32') {
    // Windows: 使用 desktopCapturer + 覆盖窗口
    await captureScreenWindows()
  } else {
    // macOS: 使用系统 screencapture
    captureScreenMacOS()
  }
}

function captureScreenMacOS() {
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

async function captureScreenWindows() {
  try {
    // 获取主显示器
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.size
    const scaleFactor = primaryDisplay.scaleFactor

    // 获取屏幕截图
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: Math.round(width * scaleFactor), height: Math.round(height * scaleFactor) }
    })

    if (sources.length === 0) {
      mainWindow?.webContents.send('translate-error', '无法获取屏幕截图')
      mainWindow?.show()
      return
    }

    const screenSource = sources[0]
    const screenshotDataUrl = screenSource.thumbnail.toDataURL()

    // 创建全屏覆盖窗口用于区域选择
    createScreenshotOverlay(screenshotDataUrl, width, height)
  } catch (err) {
    const error = err as Error
    console.error('[captureScreenWindows] error:', error)
    mainWindow?.webContents.send('translate-error', error.message)
    mainWindow?.show()
  }
}

function createScreenshotOverlay(screenshotDataUrl: string, width: number, height: number) {
  if (screenshotOverlayWindow && !screenshotOverlayWindow.isDestroyed()) {
    screenshotOverlayWindow.close()
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y } = primaryDisplay.bounds

  screenshotOverlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const overlayHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { 
          width: 100%; height: 100%; 
          overflow: hidden;
          cursor: crosshair;
        }
        .container {
          width: 100%; height: 100%;
          position: relative;
        }
        #screenshot {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          object-fit: cover;
        }
        #overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.3);
        }
        #selection {
          position: absolute;
          border: 2px solid #3b82f6;
          background: transparent;
          display: none;
          box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
        }
        .size-indicator {
          position: absolute;
          bottom: -25px;
          left: 0;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 2px 8px;
          border-radius: 3px;
          font-size: 12px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          white-space: nowrap;
        }
        .hint {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <img id="screenshot" src="" alt="screenshot">
        <div id="overlay"></div>
        <div id="selection">
          <span class="size-indicator" id="size-indicator"></span>
        </div>
      </div>
      <div class="hint">拖拽选择区域，按 ESC 取消</div>
      <script>
        const screenshot = document.getElementById('screenshot');
        const overlay = document.getElementById('overlay');
        const selection = document.getElementById('selection');
        const sizeIndicator = document.getElementById('size-indicator');
        
        let isSelecting = false;
        let startX = 0, startY = 0;
        let currentRect = null;

        window.electronAPI?.onScreenshotDataUrl?.((dataUrl) => {
          screenshot.src = dataUrl;
          overlay.style.display = 'block';
        });

        document.addEventListener('mousedown', (e) => {
          isSelecting = true;
          startX = e.clientX;
          startY = e.clientY;
          selection.style.left = startX + 'px';
          selection.style.top = startY + 'px';
          selection.style.width = '0';
          selection.style.height = '0';
          selection.style.display = 'block';
          overlay.style.display = 'none';
        });

        document.addEventListener('mousemove', (e) => {
          if (!isSelecting) return;
          
          const currentX = e.clientX;
          const currentY = e.clientY;
          
          const left = Math.min(startX, currentX);
          const top = Math.min(startY, currentY);
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);
          
          selection.style.left = left + 'px';
          selection.style.top = top + 'px';
          selection.style.width = width + 'px';
          selection.style.height = height + 'px';
          
          sizeIndicator.textContent = width + ' × ' + height;
          
          currentRect = { x: left, y: top, width, height };
        });

        document.addEventListener('mouseup', () => {
          if (!isSelecting) return;
          isSelecting = false;
          
          if (currentRect && currentRect.width > 10 && currentRect.height > 10) {
            window.electronAPI?.sendCropResult?.(currentRect);
          } else {
            // 选区太小，取消
            window.electronAPI?.sendCropResult?.(null);
          }
        });

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            window.electronAPI?.sendCropResult?.(null);
          }
        });
      </script>
    </body>
    </html>
  `

  screenshotOverlayWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(overlayHtml))

  screenshotOverlayWindow.once('ready-to-show', () => {
    screenshotOverlayWindow?.webContents.send('screenshot-dataurl', screenshotDataUrl)
  })

  screenshotOverlayWindow.on('closed', () => {
    screenshotOverlayWindow = null
  })
}

// IPC: 处理截图区域选择结果
ipcMain.on('crop-result', (_event, rect: { x: number; y: number; width: number; height: number } | null) => {
  if (screenshotOverlayWindow && !screenshotOverlayWindow.isDestroyed()) {
    screenshotOverlayWindow.close()
    screenshotOverlayWindow = null
  }

  if (!rect) {
    // 用户取消了截图
    mainWindow?.show()
    return
  }

  // 获取完整屏幕截图并裁剪
  const primaryDisplay = screen.getPrimaryDisplay()
  const scaleFactor = primaryDisplay.scaleFactor

  desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: Math.round(primaryDisplay.size.width * scaleFactor),
      height: Math.round(primaryDisplay.size.height * scaleFactor)
    }
  }).then(sources => {
    if (sources.length === 0) {
      mainWindow?.webContents.send('translate-error', '无法获取屏幕截图')
      mainWindow?.show()
      return
    }

    const fullScreenshot = sources[0].thumbnail

    // 裁剪选中区域
    const croppedImage = fullScreenshot.crop({
      x: Math.round(rect.x * scaleFactor),
      y: Math.round(rect.y * scaleFactor),
      width: Math.round(rect.width * scaleFactor),
      height: Math.round(rect.height * scaleFactor)
    })

    const base64Image = croppedImage.toPNG().toString('base64')
    mainWindow?.show()
    mainWindow?.webContents.send('screenshot-captured', base64Image)
  }).catch(err => {
    console.error('[crop-result] error:', err)
    mainWindow?.webContents.send('translate-error', (err as Error).message)
    mainWindow?.show()
  })
})

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

ipcMain.handle('check-for-updates', async () => {
  return checkForUpdates()
})

ipcMain.on('open-releases-page', async () => {
  const info = await checkForUpdates()
  shell.openExternal(info.releaseUrl)
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

  // 生产环境启动后延迟检查更新
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
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
