import { create } from 'zustand'
import { TranslationRecord } from '../lib/supabase'

type AppStatus = 'idle' | 'loading' | 'success' | 'error'

interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

interface TranslationState {
  status: AppStatus
  result: TranslateResult | null
  error: string
  lastImage: string | null
  pendingImage: string | null
  history: TranslationRecord[]
  historyLoading: boolean
  selectedRecord: TranslationRecord | null
  detailImageUrl: string | null
  copied: boolean
  updateInfo: UpdateInfo | null
  updateChecking: boolean
  showUpdateToast: boolean
  
  setStatus: (status: AppStatus) => void
  setResult: (result: TranslateResult | null) => void
  setError: (error: string) => void
  setLastImage: (image: string | null) => void
  setPendingImage: (image: string | null) => void
  setHistory: (history: TranslationRecord[]) => void
  setHistoryLoading: (loading: boolean) => void
  setSelectedRecord: (record: TranslationRecord | null) => void
  setDetailImageUrl: (url: string | null) => void
  setCopied: (copied: boolean) => void
  setUpdateInfo: (info: UpdateInfo | null) => void
  setUpdateChecking: (checking: boolean) => void
  setShowUpdateToast: (show: boolean) => void
  reset: () => void
}

export const useTranslationStore = create<TranslationState>((set) => ({
  status: 'idle',
  result: null,
  error: '',
  lastImage: null,
  pendingImage: null,
  history: [],
  historyLoading: false,
  selectedRecord: null,
  detailImageUrl: null,
  copied: false,
  updateInfo: null,
  updateChecking: false,
  showUpdateToast: false,
  
  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  setLastImage: (lastImage) => set({ lastImage }),
  setPendingImage: (pendingImage) => set({ pendingImage }),
  setHistory: (history) => set({ history }),
  setHistoryLoading: (historyLoading) => set({ historyLoading }),
  setSelectedRecord: (selectedRecord) => set({ selectedRecord }),
  setDetailImageUrl: (detailImageUrl) => set({ detailImageUrl }),
  setCopied: (copied) => set({ copied }),
  setUpdateInfo: (updateInfo) => set({ updateInfo }),
  setUpdateChecking: (updateChecking) => set({ updateChecking }),
  setShowUpdateToast: (showUpdateToast) => set({ showUpdateToast }),
  reset: () => set({
    status: 'idle',
    result: null,
    error: '',
    lastImage: null,
    pendingImage: null,
    history: [],
    historyLoading: false,
    selectedRecord: null,
    detailImageUrl: null,
    copied: false,
  }),
}))
