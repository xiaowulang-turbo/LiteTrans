import { useEffect, useCallback } from 'react'
import { supabase, getUserQuota } from '../lib/supabase'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const { user, session, loading, quota, setUser, setSession, setLoading, setQuota, reset } = useAuthStore()

  const refreshQuota = useCallback(async () => {
    if (!user) return
    const quotaData = await getUserQuota()
    setQuota(quotaData)
  }, [user, setQuota])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

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

    const handleOAuthCallback = async (url: string) => {
      console.log('[useAuth] OAuth callback received:', url)
      const hashParams = new URL(url).hash.substring(1)
      const params = new URLSearchParams(hashParams)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      console.log('[useAuth] tokens found:', !!accessToken, !!refreshToken)

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        console.log('[useAuth] setSession result:', { user: !!data?.user, session: !!data?.session, error })
        
        const sbKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
        console.log('[useAuth] localStorage after setSession:', sbKeys)
        
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
      console.log('[useAuth] registering OAuth callback listener')
      window.electronAPI.onOAuthCallback(handleOAuthCallback)
    }

    return () => subscription.unsubscribe()
  }, [setUser, setSession, setLoading, setQuota])

  const signInWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    const isExistingUser = data?.user && (!data.user.identities || data.user.identities.length === 0)
    return { data, error, isExistingUser }
  }

  const signOut = async () => {
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'))
    console.log('[signOut] removing localStorage keys:', keysToRemove)
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    reset()
    
    return { error: null }
  }

  const signInWithOAuth = async (provider: 'github' | 'google') => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'litetrans://auth/callback',
        skipBrowserRedirect: true,
      },
    })

    if (data?.url && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(data.url)
    }

    return { data, error }
  }

  return {
    user,
    session,
    loading,
    quota,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    signInWithOAuth,
    refreshQuota,
  }
}
