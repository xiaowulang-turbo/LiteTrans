import { contextBridge, ipcRenderer } from 'electron'

interface AppConfig {
  appid: string
  secret: string
  fromLang: string
  toLang: string
}

interface LangOption {
  code: string
  name: string
}

contextBridge.exposeInMainWorld('electronAPI', {
  onCaptureStart: (callback: () => void) => {
    ipcRenderer.on('capture-start', callback)
  },
  onTranslateStart: (callback: () => void) => {
    ipcRenderer.on('translate-start', callback)
  },
  onTranslateResult: (callback: (result: { image: string; sumSrc?: string; sumDst?: string }) => void) => {
    ipcRenderer.on('translate-result', (_event, result) => callback(result))
  },
  onTranslateError: (callback: (error: string) => void) => {
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
  getConfig: (): Promise<AppConfig> => {
    return ipcRenderer.invoke('get-config')
  },
  saveConfig: (config: Partial<AppConfig>): Promise<AppConfig> => {
    return ipcRenderer.invoke('save-config', config)
  },
  getSupportedLangs: (): Promise<LangOption[]> => {
    return ipcRenderer.invoke('get-supported-langs')
  },
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url)
  },
  onOAuthCallback: (callback: (url: string) => void) => {
    ipcRenderer.on('oauth-callback', (_event, url) => callback(url))
  },
})
