import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { checkAndUseQuota } from './lib/supabase'

type AppStatus = 'idle' | 'loading' | 'success' | 'error'
type ViewMode = 'main' | 'login'

interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

declare global {
  interface Window {
    electronAPI: {
      onTranslateStart: (callback: () => void) => void
      onTranslateResult: (callback: (result: TranslateResult) => void) => void
      onTranslateError: (callback: (error: string) => void) => void
      captureScreen: () => void
      copyImage: (base64: string) => void
      closeWindow: () => void
      openSettings: () => void
      openExternal: (url: string) => void
      onOAuthCallback: (callback: (url: string) => void) => void
    }
  }
}

function App() {
  const { user, loading: authLoading, quota, signInWithOAuth, signOut, refreshQuota } = useAuth()
  const [view, setView] = useState<ViewMode>('main')
  const [status, setStatus] = useState<AppStatus>('idle')
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [error, setError] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      setView('login')
    } else if (!authLoading && user && view === 'login') {
      setView('main')
    }
  }, [authLoading, user, view])

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onTranslateStart(() => {
      setStatus('loading')
      setResult(null)
      setError('')
    })

    window.electronAPI.onTranslateResult((data) => {
      setStatus('success')
      setResult(data)
      refreshQuota()
    })

    window.electronAPI.onTranslateError((err) => {
      setStatus('error')
      setError(err)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCopy = () => {
    if (result?.image) {
      window.electronAPI.copyImage(result.image)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleCapture = async () => {
    if (!user) {
      setView('login')
      return
    }
    const quotaResult = await checkAndUseQuota()
    if (!quotaResult.success) {
      setError(quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败')
      setStatus('error')
      refreshQuota()
      return
    }
    window.electronAPI.captureScreen()
  }

  const handleClose = () => {
    window.electronAPI.closeWindow()
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setAuthError('')
    const { error } = await signInWithOAuth(provider)
    if (error) setAuthError(error.message)
  }

  const handleLogout = async () => {
    await signOut()
    setView('login')
  }

  const quotaExhausted = quota?.success && quota.remaining === 0

  if (authLoading) {
    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border flex items-center justify-center">
        <span className="text-white/60 text-sm flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          加载中...
        </span>
      </div>
    )
  }

  if (view === 'login') {
    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
        <div
          className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-white/80 text-sm font-medium">LiteTrans</span>
          <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
          <h2 className="text-white text-lg font-medium">登录以使用翻译服务</h2>
          <p className="text-white/50 text-xs text-center">免费用户每日 20 次翻译配额</p>

          {authError && <p className="text-red-400 text-xs">{authError}</p>}

          <div className="flex flex-col gap-3 w-full max-w-[200px]">
            <button
              onClick={() => handleOAuthLogin('github')}
              className="w-full py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
            >
              GitHub 登录
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
      {/* 标题栏 */}
      <div
        className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <span className="text-white/80 text-sm font-medium">LiteTrans</span>
        <div
          className="flex gap-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
          />
        </div>
      </div>

      {/* 状态指示 */}
      <div className="px-4 py-2 border-b border-glass-border flex items-center justify-between">
        <div>
          {status === 'idle' && (
            <span className="text-white/60 text-xs">按 Alt+Q 截图翻译</span>
          )}
          {status === 'loading' && (
            <span className="text-blue-400 text-xs flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              翻译中...
            </span>
          )}
          {status === 'success' && (
            <span className="text-green-400 text-xs">✓ 翻译完成</span>
          )}
          {status === 'error' && (
            <span className="text-red-400 text-xs">✗ {error}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {quota?.success && (
            <span className={`text-xs ${quotaExhausted ? 'text-red-400' : 'text-white/50'}`}>
              {quota.remaining}/{quota.daily_limit}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="text-white/40 hover:text-white/60 text-xs"
          >
            退出
          </button>
        </div>
      </div>

      {/* 图片展示 */}
      <div className="flex-1 p-4 flex items-center justify-center min-h-[200px]">
        {result?.image ? (
          <img
            src={`data:image/png;base64,${result.image}`}
            alt="翻译结果"
            className="max-w-full max-h-[400px] rounded-lg object-contain"
          />
        ) : (
          <div className="text-white/40 text-sm">暂无翻译结果</div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="px-4 py-3 border-t border-glass-border flex gap-2">
        <button
          onClick={handleCapture}
          disabled={quotaExhausted}
          className="flex-1 py-2 rounded-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white/80 text-sm transition-colors"
        >
          {quotaExhausted ? '配额已用完' : '重新截图'}
        </button>
        <button
          onClick={handleCopy}
          disabled={!result?.image}
          className="flex-1 py-2 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white text-sm transition-colors"
        >
          {copied ? '已复制 ✓' : '复制图片'}
        </button>
      </div>
    </div>
  )
}

export default App
