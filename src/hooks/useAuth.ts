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
      (_event, session) => {
        const user = session?.user ?? null
        setState(prev => ({
          ...prev,
          session,
          user,
          loading: false,
        }))

        // 不在 onAuthStateChange 中调用异步 API，避免死锁
        // 使用 setTimeout 延迟执行，跳出 onAuthStateChange 上下文
        if (user) {
          setTimeout(async () => {
            const quota = await getUserQuota()
            setState(prev => ({ ...prev, quota }))
          }, 0)
        } else {
          setState(prev => ({ ...prev, quota: null }))
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
        
        // 验证 session 是否被正确存储
        const sbKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-'))
        console.log('[useAuth] localStorage after setSession:', sbKeys)
        
        // setSession 成功后手动更新状态
        if (data?.session && data?.user) {
          setState(prev => ({
            ...prev,
            session: data.session,
            user: data.user,
            loading: false,
          }))
          // 延迟获取 quota，避免死锁
          setTimeout(async () => {
            const quota = await getUserQuota()
            setState(prev => ({ ...prev, quota }))
          }, 0)
        }
      }
    }

    if (window.electronAPI?.onOAuthCallback) {
      console.log('[useAuth] registering OAuth callback listener')
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
    // 清除所有 Supabase 相关的 localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => key.startsWith('sb-'))
    console.log('[signOut] removing localStorage keys:', keysToRemove)
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // 清除 React 状态
    setState({
      user: null,
      session: null,
      loading: false,
      quota: null,
    })
    
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
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    signInWithOAuth,
    refreshQuota,
  }
}
