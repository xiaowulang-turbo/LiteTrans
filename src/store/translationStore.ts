import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { 
  TranslationRecord, supabase, checkAndUseQuota, 
  translateImageViaEdge, uploadTranslationImage, saveTranslation 
} from '../lib/supabase'

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
  loadHistory: () => Promise<void>
  translateImage: (base64Image: string, userId: string, accessToken: string, toLang: string) => Promise<void>
  reset: () => void
}

export const useTranslationStore = create<TranslationState>()(
  persist(
    (set, get) => ({
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

      loadHistory: async () => {
        // Only show loading if we have absolutely no data (first run)
        // This provides the "instant load" feel if we have cached data
        if (get().history.length === 0) {
          set({ historyLoading: true })
        }
        
        try {
          const { data, error } = await supabase
            .from('translation_history')
            .select('*')
            .order('created_at', { ascending: false })
          
          if (error) throw error
          set({ history: data as TranslationRecord[] })
        } catch (e) {
          console.error('Failed to load history:', e)
        } finally {
          set({ historyLoading: false })
        }
      },
      
      translateImage: async (base64Image: string, userId: string, accessToken: string, toLang: string) => {
        set({ status: 'loading', result: null, error: '' })
        
        try {
          // 1. Check Quota
          const quotaResult = await checkAndUseQuota()
          if (!quotaResult.success) {
            set({ 
              status: 'error', 
              error: quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败' 
            })
            return
          }
          
          // 2. Translate
          const translateResult = await translateImageViaEdge(base64Image, accessToken, 'auto', toLang)
          
          if (translateResult.error_code === '0' && translateResult.data) {
            const result: TranslateResult = {
              image: translateResult.data?.pasteImg || '',
              sumSrc: translateResult.data?.sumSrc,
              sumDst: translateResult.data?.sumDst,
            }
            
            set({ status: 'success', result })
            
            // 3. Save History
            if (userId && translateResult.data?.pasteImg) {
              uploadTranslationImage(userId, translateResult.data.pasteImg).then(async (imagePath) => {
                await saveTranslation({
                  user_id: userId,
                  source_text: translateResult.data?.sumSrc || null,
                  translated_text: translateResult.data?.sumDst || null,
                  source_lang: 'auto',
                  target_lang: toLang,
                  status: 'success',
                  image_size: base64Image.length,
                  image_path: imagePath,
                  error_message: null,
                })
                // Reload history to show new item
                await get().loadHistory()
              }).catch(console.error)
            }
          } else {
             set({ status: 'error', error: translateResult.error_msg || '翻译失败' })
          }
        } catch (e) {
          set({ status: 'error', error: (e as Error).message || '翻译失败' })
        }
      },

      reset: () => set({
        status: 'idle',
        result: null,
        error: '',
        lastImage: null,
        pendingImage: null,
        // Don't clear history on reset, or user will lose offline cache if they logout/reset?
        // Usually reset() is for "logout". If so, we SHOULD clear history.
        // But for app reset? Let's check semantic. 
        // Given 'history' is user-specific, if we switch users, we definitely want to clear it.
        // For now, let's keep it clearing history to ensure security between accounts.
        history: [], 
        historyLoading: false,
        selectedRecord: null,
        detailImageUrl: null,
        copied: false,
      }),
    }),
    {
      name: 'litetrans-storage',
      storage: createJSONStorage(() => localStorage),
      // Partialize: Only persist 'history'
      // We don't persist 'status', 'result', etc. as those are transient.
      partialize: (state) => ({ 
        history: state.history 
      }),
    }
  )
)
