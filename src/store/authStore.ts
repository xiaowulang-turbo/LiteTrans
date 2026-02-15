import { create } from 'zustand'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { QuotaInfo, getUserQuota, supabase } from '../lib/supabase'


interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  quota: QuotaInfo | null
  
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setQuota: (quota: QuotaInfo | null) => void
  refreshQuota: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; isExistingUser?: boolean }>
  signInWithOAuth: (provider: 'github' | 'google') => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
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
  refreshQuota: async () => {
    try {
      const quota = await getUserQuota()
      set({ quota })
    } catch (e) {
      console.error('Failed to refresh quota:', e)
    }
  },
  signInWithEmail: async (email, password) => {
    set({ loading: true })
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    set({ loading: false })
    return { error }
  },
  signUpWithEmail: async (email, password) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signUp({ email, password })
    const isExistingUser = data?.user && (!data.user.identities || data.user.identities.length === 0)
    set({ loading: false })
    return { error, isExistingUser: !!isExistingUser }
  },
  signInWithOAuth: async (provider) => {
    set({ loading: true })
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'litetrans://auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) {
       // Open external URL
       if (window.electronAPI?.openExternal) {
         window.electronAPI.openExternal(data.url)
       } else {
         window.open(data.url, '_blank')
       }
    }
    set({ loading: false })
    return { error }
  },
  signOut: async () => {
    set({ loading: true })
    await supabase.auth.signOut()
    set({ user: null, session: null, quota: null, loading: false })
  },
  reset: () => set({ user: null, session: null, loading: false, quota: null }),
}))
