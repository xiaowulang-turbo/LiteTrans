import { contextBridge, ipcRenderer } from 'electron'

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  onScreenshotCaptured: (callback: (base64: string) => void) => {
    ipcRenderer.removeAllListeners('screenshot-captured')
    ipcRenderer.on('screenshot-captured', (_event, base64) => callback(base64))
  },
  onTranslateStart: (callback: () => void) => {
    ipcRenderer.removeAllListeners('translate-start')
    ipcRenderer.on('translate-start', callback)
  },
  onTranslateResult: (callback: (result: { image: string; sumSrc?: string; sumDst?: string }) => void) => {
    ipcRenderer.removeAllListeners('translate-result')
    ipcRenderer.on('translate-result', (_event, result) => callback(result))
  },
  onTranslateError: (callback: (error: string) => void) => {
    ipcRenderer.removeAllListeners('translate-error')
    ipcRenderer.on('translate-error', (_event, error) => callback(error))
  },
  captureScreen: () => {
    ipcRenderer.send('capture-screen')
  },
  copyImage: (base64: string) => {
    ipcRenderer.send('copy-image', base64)
  },
  closeWindow: () => {
    ipcRenderer.send('close-window')
  },
  minimizeWindow: () => {
    ipcRenderer.send('minimize-window')
  },
  maximizeWindow: () => {
    ipcRenderer.send('maximize-window')
  },
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url)
  },
  onOAuthCallback: (callback: (url: string) => void) => {
    ipcRenderer.removeAllListeners('oauth-callback')
    ipcRenderer.on('oauth-callback', (_event, url) => callback(url))
  },
  getShortcut: (): Promise<string> => {
    return ipcRenderer.invoke('get-shortcut')
  },
  setShortcut: (shortcut: string): Promise<{ success: boolean; shortcut: string }> => {
    return ipcRenderer.invoke('set-shortcut', shortcut)
  },
  getPresetShortcuts: (): Promise<string[]> => {
    return ipcRenderer.invoke('get-preset-shortcuts')
  },
  openPreview: (base64: string) => {
    ipcRenderer.send('open-preview', base64)
  },
  onPreviewImage: (callback: (base64: string) => void) => {
    ipcRenderer.removeAllListeners('preview-image')
    ipcRenderer.on('preview-image', (_event, base64) => callback(base64))
  },
  toggleAlwaysOnTop: (windowType: 'main' | 'preview' = 'main'): Promise<boolean> => {
    return ipcRenderer.invoke('toggle-always-on-top', windowType)
  },
  getAlwaysOnTop: (windowType: 'main' | 'preview' = 'main'): Promise<boolean> => {
    return ipcRenderer.invoke('get-always-on-top', windowType)
  },
  resizePreviewWindow: (width: number, height: number) => {
    ipcRenderer.send('resize-preview-window', width, height)
  },
  checkForUpdates: (): Promise<UpdateInfo> => {
    return ipcRenderer.invoke('check-for-updates')
  },
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => {
    ipcRenderer.removeAllListeners('update-available')
    ipcRenderer.on('update-available', (_event, info) => callback(info))
  },
  openReleasesPage: () => {
    ipcRenderer.send('open-releases-page')
  },
})
