import { create } from 'zustand'
import {
  checkAndUseQuota,
  translateImageViaEdge, uploadTranslationImage, saveTranslation
} from '../lib/supabase'
import { useHistoryStore } from './historyStore'

type AppStatus = 'idle' | 'loading' | 'success' | 'error'

export interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

interface TranslationState {
  status: AppStatus
  result: TranslateResult | null
  error: string
  lastImage: string | null
  pendingImage: string | null

  setStatus: (status: AppStatus) => void
  setResult: (result: TranslateResult | null) => void
  setError: (error: string) => void
  setLastImage: (image: string | null) => void
  setPendingImage: (image: string | null) => void
  translateImage: (base64Image: string, userId: string, accessToken: string, toLang: string) => Promise<void>
  reset: () => void
}

const initialState = {
  status: 'idle' as AppStatus,
  result: null as TranslateResult | null,
  error: '',
  lastImage: null as string | null,
  pendingImage: null as string | null,
}

export const useTranslationStore = create<TranslationState>((set) => ({
  ...initialState,

  setStatus: (status) => set({ status }),
  setResult: (result) => set({ result }),
  setError: (error) => set({ error }),
  setLastImage: (lastImage) => set({ lastImage }),
  setPendingImage: (pendingImage) => set({ pendingImage }),

  translateImage: async (base64Image: string, userId: string, accessToken: string, toLang: string) => {
    set({ status: 'loading', result: null, error: '' })

    try {
      const quotaResult = await checkAndUseQuota()
      if (!quotaResult.success) {
        set({
          status: 'error',
          error: quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败'
        })
        return
      }

      const appVersion = window.electronAPI?.getAppVersion?.() || 'unknown'
      const translateResult = await translateImageViaEdge(base64Image, accessToken, 'auto', toLang, appVersion)

      // 处理版本控制错误
      if (translateResult.error_code === 'VERSION_BLOCKED' || translateResult.error_code === 'FORCE_UPDATE' || translateResult.error_code === 'VERSION_REQUIRED') {
        set({
          status: 'error',
          error: translateResult.error_msg || '版本已过期，请更新'
        })
        return
      }

      if (translateResult.error_code === '0' && translateResult.data) {
        const result: TranslateResult = {
          image: translateResult.data?.pasteImg || '',
          sumSrc: translateResult.data?.sumSrc,
          sumDst: translateResult.data?.sumDst,
        }

        set({ status: 'success', result })

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
            await useHistoryStore.getState().loadHistory()
          }).catch(console.error)
        }
      } else {
        set({ status: 'error', error: translateResult.error_msg || '翻译失败' })
      }
    } catch (e) {
      set({ status: 'error', error: (e as Error).message || '翻译失败' })
    }
  },

  reset: () => set(initialState),
}))
