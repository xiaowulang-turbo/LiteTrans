import { BrowserWindow, screen, ipcMain } from 'electron'
import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Monitor, Image } from 'node-screenshots'
import { showAndFocusWindow } from './window'

const TEMP_SCREENSHOT_PATH = path.join(os.tmpdir(), 'litetrans_screenshot.png')

let screenshotOverlayWindow: BrowserWindow | null = null
let lastScreenshot: Image | null = null

export async function captureScreen(
  mainWindow: BrowserWindow | null,
  platform: NodeJS.Platform
) {
  mainWindow?.hide()

  if (platform === 'win32') {
    await captureScreenWindows(mainWindow)
  } else {
    captureScreenMacOS(mainWindow)
  }
}

function captureScreenMacOS(mainWindow: BrowserWindow | null) {
  exec(`screencapture -i "${TEMP_SCREENSHOT_PATH}"`, async (error) => {
    if (error) {
      mainWindow?.webContents.send('translate-error', '截图失败')
      showAndFocusWindow(mainWindow)
      return
    }

    if (!fs.existsSync(TEMP_SCREENSHOT_PATH)) {
      return
    }

    showAndFocusWindow(mainWindow)

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

async function captureScreenWindows(mainWindow: BrowserWindow | null) {
  try {
    console.time('screenshot-capture')
    
    const monitors = Monitor.all()
    if (monitors.length === 0) {
      mainWindow?.webContents.send('translate-error', '无法获取显示器')
      showAndFocusWindow(mainWindow)
      return
    }
    
    const monitor = (monitors.find(m => m.isPrimary) || monitors[0]) as Monitor
    lastScreenshot = monitor.captureImageSync()
    const pngBuffer = lastScreenshot.toPngSync()
    
    console.timeEnd('screenshot-capture')
    
    showScreenshotOverlay(pngBuffer)
  } catch (err) {
    const error = err as Error
    console.error('[captureScreenWindows] error:', error)
    mainWindow?.webContents.send('translate-error', error.message)
    showAndFocusWindow(mainWindow)
  }
}

function prepareScreenshotOverlay() {
  if (screenshotOverlayWindow && !screenshotOverlayWindow.isDestroyed()) {
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds

  screenshotOverlayWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  
  screenshotOverlayWindow.setAlwaysOnTop(true, 'screen-saver')

  const overlayHtml = getOverlayHtml()
  screenshotOverlayWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(overlayHtml))

  screenshotOverlayWindow.on('closed', () => {
    screenshotOverlayWindow = null
  })
}

function showScreenshotOverlay(pngBuffer: Buffer) {
  if (!screenshotOverlayWindow || screenshotOverlayWindow.isDestroyed()) {
    prepareScreenshotOverlay()
  }
  
  const primaryDisplay = screen.getPrimaryDisplay()
  const { x, y, width, height } = primaryDisplay.bounds
  screenshotOverlayWindow?.setBounds({ x, y, width, height })
  
  screenshotOverlayWindow?.show()
  screenshotOverlayWindow?.webContents.send('screenshot-buffer', pngBuffer)
}

export function setupScreenshotIPC(mainWindow: BrowserWindow | null) {
  ipcMain.on('crop-result', (_event, rect: { x: number; y: number; width: number; height: number } | null) => {
    if (screenshotOverlayWindow && !screenshotOverlayWindow.isDestroyed()) {
      screenshotOverlayWindow.close()
      screenshotOverlayWindow = null
    }

    if (!rect) {
      lastScreenshot = null
      return
    }

    try {
      if (!lastScreenshot) {
        throw new Error('未获取到截图缓存')
      }

      console.time('screenshot-crop')
      
      const primaryDisplay = screen.getPrimaryDisplay()
      const scaleFactor = primaryDisplay.scaleFactor
      
      const croppedImage = lastScreenshot.cropSync(
        Math.round(rect.x * scaleFactor),
        Math.round(rect.y * scaleFactor),
        Math.round(rect.width * scaleFactor),
        Math.round(rect.height * scaleFactor)
      )
      
      const pngBuffer = croppedImage.toPngSync()
      const base64Image = pngBuffer.toString('base64')
      
      lastScreenshot = null
      
      console.timeEnd('screenshot-crop')

      showAndFocusWindow(mainWindow)
      mainWindow?.webContents.send('screenshot-captured', base64Image)
    } catch (err) {
      console.error('[crop-result] error:', err)
      lastScreenshot = null
      mainWindow?.webContents.send('translate-error', (err as Error).message)
      showAndFocusWindow(mainWindow)
    }
  })
}

function getOverlayHtml(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { width: 100%; height: 100%; overflow: hidden; cursor: crosshair; }
        .container { width: 100%; height: 100%; position: relative; }
        #screenshot { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; }
        #overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.3); }
        #selection { position: absolute; border: 2px solid #3b82f6; background: transparent; display: none; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5); }
        .size-indicator { position: absolute; bottom: -25px; left: 0; background: rgba(0, 0, 0, 0.7); color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; white-space: nowrap; }
        .hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(0, 0, 0, 0.8); color: white; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
      </style>
    </head>
    <body>
      <div class="container">
        <img id="screenshot" src="" alt="screenshot">
        <div id="overlay"></div>
        <div id="selection"><span class="size-indicator" id="size-indicator"></span></div>
      </div>
      <div class="hint">拖拽选择区域，按 ESC 取消</div>
      <script>
        const screenshot = document.getElementById('screenshot');
        const overlay = document.getElementById('overlay');
        const selection = document.getElementById('selection');
        const sizeIndicator = document.getElementById('size-indicator');
        let isSelecting = false, startX = 0, startY = 0, currentRect = null;
        
        window.electronAPI?.onScreenshotBuffer?.((buffer) => {
          const blob = new Blob([buffer], { type: 'image/png' });
          const url = URL.createObjectURL(blob);
          screenshot.src = url;
          screenshot.onload = () => URL.revokeObjectURL(url);
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
          const currentX = e.clientX, currentY = e.clientY;
          const left = Math.min(startX, currentX), top = Math.min(startY, currentY);
          const width = Math.abs(currentX - startX), height = Math.abs(currentY - startY);
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
            window.electronAPI?.sendCropResult?.(null);
          }
        });
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') window.electronAPI?.sendCropResult?.(null);
        });
      </script>
    </body>
    </html>
  `
}
