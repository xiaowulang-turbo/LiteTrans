import { Tray, Menu, nativeImage, app } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

let tray: Tray | null = null

export function createTray(
  onCapture: () => void,
  onShowWindow: () => void,
  onQuit: () => void
) {
  const trayIconPath = isDev
    ? path.join(app.getAppPath(), 'build/trayIcon.png')
    : path.join(process.resourcesPath, 'trayIcon.png')
  
  const icon = nativeImage.createFromPath(trayIconPath)
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('LiteTrans - 截图即译')

  const contextMenu = Menu.buildFromTemplate([
    { label: '截图翻译', click: onCapture },
    { label: '显示窗口', click: onShowWindow },
    { type: 'separator' },
    { label: '退出', click: onQuit },
  ])

  tray.setContextMenu(contextMenu)
  
  return tray
}

export function getTray() {
  return tray
}
