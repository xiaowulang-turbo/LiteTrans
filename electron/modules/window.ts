import { BrowserWindow, app } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

export let mainWindow: BrowserWindow | null = null
export let previewWindow: BrowserWindow | null = null

export function createMainWindow() {
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

export function createPreviewWindow(base64: string) {
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.webContents.send('preview-image', base64)
    previewWindow.show()
    return previewWindow
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

    const previewHtml = getPreviewWindowHtml(process.platform)
  previewWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(previewHtml))

  previewWindow.on('closed', () => {
    previewWindow = null
  })

  previewWindow.webContents.on('did-finish-load', () => {
    previewWindow?.webContents.send('preview-image', base64)
    previewWindow?.show()
  })

  return previewWindow
}

function getPreviewWindowHtml(platform: string): string {
  const isMac = platform === 'darwin'
  const windowsControls = `
    <div class="windows-controls">
      <button class="win-btn win-minimize" id="minimize-btn" title="最小化">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0,5 L10,5 M0,6 L10,6" stroke="currentColor" stroke-width="1"/></svg>
      </button>
      <button class="win-btn win-maximize" id="maximize-btn" title="最大化">
        <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="currentColor" stroke-width="1" fill="none"/></svg>
      </button>
      <button class="win-btn win-close" onclick="window.close()" title="关闭">
        <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0,0 L10,10 M10,0 L0,10" stroke="currentColor" stroke-width="1"/></svg>
      </button>
    </div>
  `

  const macControls = `
    <div class="mac-controls">
      <button class="traffic-btn close-btn" onclick="window.close()" title="关闭"><span>×</span></button>
      <button class="traffic-btn minimize-btn" id="minimize-btn" title="最小化"><span>−</span></button>
      <button class="traffic-btn maximize-btn" id="maximize-btn" title="最大化"><span>+</span></button>
    </div>
  `

  return `
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .container {
          width: 100%; height: 100%;
          display: flex; flex-direction: column;
        }
        .header {
          height: 32px; 
          background: rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 ${isMac ? '12px' : '0'};
          -webkit-app-region: drag;
          position: relative;
        }
        .title-container {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
        }
        .header span { color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 500;}
        
        .header-left {
          display: flex; align-items: center; gap: 8px;
          -webkit-app-region: no-drag;
          min-width: 60px;
        }
        /* MacOS Controls */
        .mac-controls { display: flex; gap: 8px; }
        .traffic-btn {
          width: 12px; height: 12px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; color: rgba(0,0,0,0.6);
          transition: all 0.2s;
          border: none; cursor: pointer;
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
          display: flex; align-items: center;
          -webkit-app-region: no-drag;
          min-width: 60px;
          justify-content: flex-end;
          height: 100%;
        }
        .pin-btn {
          width: 40px; height: 100%; border-radius: 0;
          background: transparent; font-size: 12px;
          cursor: pointer; transition: all 0.2s;
          border: none;
          display: flex; align-items: center; justify-content: center;
        }
        .pin-btn.active { filter: none; }
        .pin-btn.inactive { filter: grayscale(1); opacity: 0.5; }
        .pin-btn:hover { opacity: 1; background: rgba(255,255,255,0.1); }
        
        /* Windows Controls */
        .windows-controls { display: flex; height: 100%; }
        .win-btn {
          width: 46px; height: 100%;
          background: transparent; color: rgba(255,255,255,0.7);
          border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background-color 0.2s;
        }
        .win-btn:hover { background-color: rgba(255,255,255,0.1); color: white; }
        .win-close:hover { background-color: #e81123; color: white; }
        
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
            ${isMac ? macControls : ''}
          </div>
          <div class="title-container">
            <span>图片预览 (ESC 关闭)</span>
          </div>
          <div class="header-right">
            <button class="pin-btn inactive" id="pin-btn" title="窗口置顶">📌</button>
            ${!isMac ? windowsControls : ''}
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
}
