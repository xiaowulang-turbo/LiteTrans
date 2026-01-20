import { useState, useEffect, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getUserQuota, QuotaInfo } from '../lib/supabase'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  quota: QuotaInfo | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    quota: null,
  })

  const userRef = useRef<User | null>(null)
  userRef.current = state.user

  const refreshQuota = useCallback(async () => {
    if (!userRef.current) return
    const quota = await getUserQuota()
    setState(prev => ({ ...prev, quota }))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        session,
        user: session?.user ?? null,
        loading: false,
      }))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const user = session?.user ?? null
        setState(prev => ({
          ...prev,
          session,
          user,
          loading: false,
        }))

        if (user) {
          const quota = await getUserQuota()
          setState(prev => ({ ...prev, quota }))
        } else {
          setState(prev => ({ ...prev, quota: null }))
        }
      }
    )

    const handleOAuthCallback = async (url: string) => {
      const hashParams = new URL(url).hash.substring(1)
      const params = new URLSearchParams(hashParams)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      }
    }

    if (window.electronAPI?.onOAuthCallback) {
      window.electronAPI.onOAuthCallback(handleOAuthCallback)
    }

    return () => subscription.unsubscribe()
  }, [])

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
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
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
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    signInWithOAuth,
    refreshQuota,
  }
}
