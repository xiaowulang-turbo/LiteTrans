export {}

declare global {
  interface Window {
    electronAPI: {
      onScreenshotCaptured: (callback: (base64: string) => void) => void
      onTranslateStart: (callback: () => void) => void
      onTranslateResult: (callback: (result: any) => void) => void
      onTranslateError: (callback: (error: string) => void) => void
      captureScreen: () => void
      copyImage: (base64: string) => void
      closeWindow: () => void
      minimizeWindow: () => void
      maximizeWindow: () => void
      openExternal: (url: string) => void
      onOAuthCallback: (callback: (url: string) => void) => void
      getShortcut: () => Promise<string>
      setShortcut: (shortcut: string) => Promise<{ success: boolean; shortcut: string }>
      getPresetShortcuts: () => Promise<string[]>
      openPreview: (base64: string) => void
      toggleAlwaysOnTop: (windowType?: 'main' | 'preview') => Promise<boolean>
      getAlwaysOnTop: (windowType?: 'main' | 'preview') => Promise<boolean>
      checkForUpdates: () => Promise<any>
      onUpdateAvailable: (callback: (info: any) => void) => void
      openReleasesPage: () => void
      getPlatform: () => string
      getCachedImage: (storagePath: string) => Promise<string | null>
      saveImageToCache: (url: string, storagePath: string) => Promise<string | null>
    }
  }
}
