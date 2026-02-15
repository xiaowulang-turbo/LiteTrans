import { create } from 'zustand'

export type ViewMode = 'main' | 'login' | 'profile' | 'history' | 'historyDetail'
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
  togglePin: () => Promise<void>
  init: () => Promise<void>
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
  
  togglePin: async () => {
    if (!window.electronAPI?.toggleAlwaysOnTop) return
    const newState = await window.electronAPI.toggleAlwaysOnTop('main')
    set({ isPinned: newState })
  },
  
  init: async () => {
    if (!window.electronAPI) return
    
    const platform = (window.electronAPI.getPlatform?.() || 'win32') as Platform
    set({ platform })
    
    try {
      const shortcut = await window.electronAPI.getShortcut?.()
      if (shortcut) set({ shortcut })
      
      const presetShortcuts = await window.electronAPI.getPresetShortcuts?.()
      if (presetShortcuts) set({ presetShortcuts })
      
      const isPinned = await window.electronAPI.getAlwaysOnTop?.('main')
      set({ isPinned: !!isPinned })
    } catch (e) {
      console.error('Failed to init app store:', e)
    }
  }
}))
