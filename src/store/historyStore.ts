import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { TranslationRecord, supabase } from '../lib/supabase'

interface HistoryState {
  history: TranslationRecord[]
  historyLoading: boolean
  selectedRecord: TranslationRecord | null
  detailImageUrl: string | null

  setHistory: (history: TranslationRecord[]) => void
  setHistoryLoading: (loading: boolean) => void
  setSelectedRecord: (record: TranslationRecord | null) => void
  setDetailImageUrl: (url: string | null) => void
  loadHistory: () => Promise<void>
  clearHistory: () => void
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      historyLoading: false,
      selectedRecord: null,
      detailImageUrl: null,

      setHistory: (history) => set({ history }),
      setHistoryLoading: (historyLoading) => set({ historyLoading }),
      setSelectedRecord: (selectedRecord) => set({ selectedRecord }),
      setDetailImageUrl: (detailImageUrl) => set({ detailImageUrl }),

      loadHistory: async () => {
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

      clearHistory: () => set({
        history: [],
        selectedRecord: null,
        detailImageUrl: null,
      }),
    }),
    {
      name: 'litetrans-history',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ history: state.history }),
    }
  )
)
