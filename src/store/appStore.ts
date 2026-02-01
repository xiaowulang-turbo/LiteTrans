import { create } from 'zustand'

type ViewMode = 'main' | 'login' | 'profile' | 'history' | 'historyDetail'
type Platform = 'win32' | 'darwin' | 'linux'

interface AppState {
  view: ViewMode
  platform: Platform
  isPinned: boolean
  shortcut: string
  presetShortcuts: string[]
  targetLang: 'zh' | 'en' | 'jp' | 'kor'
  
  setView: (view: ViewMode) => void
  setPlatform: (platform: Platform) => void
  setIsPinned: (isPinned: boolean) => void
  setShortcut: (shortcut: string) => void
  setPresetShortcuts: (shortcuts: string[]) => void
  setTargetLang: (lang: 'zh' | 'en' | 'jp' | 'kor') => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'main',
  platform: 'win32',
  isPinned: false,
  shortcut: 'Alt+Q',
  presetShortcuts: [],
  targetLang: 'zh',
  
  setView: (view) => set({ view }),
  setPlatform: (platform) => set({ platform }),
  setIsPinned: (isPinned) => set({ isPinned }),
  setShortcut: (shortcut) => set({ shortcut }),
  setPresetShortcuts: (presetShortcuts) => set({ presetShortcuts }),
  setTargetLang: (targetLang) => set({ targetLang }),
}))
