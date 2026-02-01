import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'
import { QuotaInfo } from '../lib/supabase'


interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  quota: QuotaInfo | null
  
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setQuota: (quota: QuotaInfo | null) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  loading: true,
  quota: null,
  
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setQuota: (quota) => set({ quota }),
  reset: () => set({ user: null, session: null, loading: false, quota: null }),
}))
