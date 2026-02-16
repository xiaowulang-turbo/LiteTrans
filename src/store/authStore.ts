import { create } from 'zustand'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { QuotaInfo, getUserQuota, supabase } from '../lib/supabase'

interface AuthState {
  // State
  user: User | null
  session: Session | null
  loading: boolean
  quota: QuotaInfo | null
  initialized: boolean

  // Setters
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  setQuota: (quota: QuotaInfo | null) => void

  // Actions
  initialize: () => () => void
  refreshQuota: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null }>
  signUpWithEmail: (email: string, password: string) => Promise<{ error: AuthError | null; isExistingUser?: boolean }>
  signInWithOAuth: (provider: 'github' | 'google') => Promise<{ error: AuthError | null }>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  loading: true,
  quota: null,
  initialized: false,

  // Setters
  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setLoading: (loading) => set({ loading }),
  setQuota: (quota) => set({ quota }),

  initialize: () => {
    const { setSession, setUser, setLoading, setQuota } = get()

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        setSession(session)
        setUser(currentUser)
        setLoading(false)

        if (currentUser) {
          setTimeout(async () => {
            const quotaData = await getUserQuota()
            setQuota(quotaData)
          }, 0)
        } else {
          setQuota(null)
        }
      }
    )

    // Setup OAuth callback listener
    const handleOAuthCallback = async (url: string) => {
      console.log('[authStore] OAuth callback:', url)
      const hashParams = new URL(url).hash.substring(1)
      const params = new URLSearchParams(hashParams)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })

        if (data?.session && data?.user) {
          setSession(data.session)
          setUser(data.user)
          setLoading(false)
          setTimeout(async () => {
            const quotaData = await getUserQuota()
            setQuota(quotaData)
          }, 0)
        }
      }
    }

    if (window.electronAPI?.onOAuthCallback) {
      window.electronAPI.onOAuthCallback(handleOAuthCallback)
    }

    set({ initialized: true })

    // Return cleanup function
    return () => subscription.unsubscribe()
  },

  refreshQuota: async () => {
    const { user, setQuota } = get()
    if (!user) return
    const quotaData = await getUserQuota()
    setQuota(quotaData)
  },

  signInWithEmail: async (email, password) => {
    const { setLoading } = get()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    return { error }
  },

  signUpWithEmail: async (email, password) => {
    const { setLoading } = get()
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    const isExistingUser = data?.user && (!data.user.identities || data.user.identities.length === 0)
    setLoading(false)
    return { error, isExistingUser: !!isExistingUser }
  },

  signInWithOAuth: async (provider) => {
    const { setLoading } = get()
    setLoading(true)
    // Electron 使用 litetrans:// 协议接收 OAuth 回调
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'litetrans://auth/callback',
        skipBrowserRedirect: true,
      },
    })
    if (data?.url) {
      if (window.electronAPI?.openExternal) {
        window.electronAPI.openExternal(data.url)
      } else {
        window.open(data.url, '_blank')
      }
    }
    setLoading(false)
    return { error }
  },

  signOut: async () => {
    const { setUser, setSession, setLoading, setQuota } = get()
    setLoading(true)
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setQuota(null)
    setLoading(false)
  },
}))
