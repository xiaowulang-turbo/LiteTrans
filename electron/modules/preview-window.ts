import { BrowserWindow } from 'electron'
import path from 'path'
import { getPreviewWindowHtml } from './preview-html'

export let previewWindow: BrowserWindow | null = null

export function createPreviewWindow(base64: string): BrowserWindow {
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

export function getPreviewWindow(): BrowserWindow | null {
  return previewWindow
}
