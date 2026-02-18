export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

export interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

export interface VersionBlockInfo {
  allowed: boolean
  reason?: 'force_update' | 'blocked'
  message?: string
  update_url?: string
  latest_version?: string
}

declare global {
  interface Window {
    electronAPI: {
      onScreenshotCaptured: (callback: (base64: string) => void) => void
      onTranslateStart: (callback: () => void) => void
      onTranslateResult: (callback: (result: TranslateResult) => void) => void
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
      checkForUpdates: () => Promise<UpdateInfo>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void
      openReleasesPage: () => void
      getPlatform: () => string
      getCachedImage: (storagePath: string) => Promise<string | null>
      saveImageToCache: (url: string, storagePath: string) => Promise<string | null>
      getAppVersion: () => string
      onVersionBlocked: (callback: (info: VersionBlockInfo) => void) => void
    }
  }
}
