import { contextBridge, ipcRenderer } from 'electron'

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
  openSettings: () => {
    ipcRenderer.send('open-settings')
  },
})
