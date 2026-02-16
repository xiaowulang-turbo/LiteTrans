import { create } from 'zustand'

export interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

interface UIState {
  copied: boolean
  updateInfo: UpdateInfo | null
  updateChecking: boolean
  showUpdateToast: boolean

  setCopied: (copied: boolean) => void
  setUpdateInfo: (info: UpdateInfo | null) => void
  setUpdateChecking: (checking: boolean) => void
  setShowUpdateToast: (show: boolean) => void
  dismissUpdateToast: () => void
}

export const useUIStore = create<UIState>((set) => ({
  copied: false,
  updateInfo: null,
  updateChecking: false,
  showUpdateToast: false,

  setCopied: (copied) => set({ copied }),
  setUpdateInfo: (updateInfo) => set({ updateInfo }),
  setUpdateChecking: (updateChecking) => set({ updateChecking }),
  setShowUpdateToast: (showUpdateToast) => set({ showUpdateToast }),
  dismissUpdateToast: () => set({ showUpdateToast: false, updateInfo: null }),
}))
