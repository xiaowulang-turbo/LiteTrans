import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { checkAndUseQuota, translateImageViaEdge, supabase, saveTranslation, getTranslationHistory, TranslationRecord } from './lib/supabase'

type AppStatus = 'idle' | 'loading' | 'success' | 'error'
type ViewMode = 'main' | 'login' | 'profile' | 'history' | 'historyDetail'

interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

declare global {
  interface Window {
    electronAPI: {
      onScreenshotCaptured: (callback: (base64: string) => void) => void
      onTranslateStart: (callback: () => void) => void
      onTranslateResult: (callback: (result: TranslateResult) => void) => void
      onTranslateError: (callback: (error: string) => void) => void
      captureScreen: () => void
      copyImage: (base64: string) => void
      closeWindow: () => void
      openExternal: (url: string) => void
      onOAuthCallback: (callback: (url: string) => void) => void
    }
  }
}

function App() {
  const { user, session, loading: authLoading, quota, signInWithOAuth, signInWithEmail, signUpWithEmail, signOut, refreshQuota } = useAuth()
  
  const [view, setView] = useState<ViewMode>('main')
  const [status, setStatus] = useState<AppStatus>('idle')
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [error, setError] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authSubmitting, setAuthSubmitting] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [history, setHistory] = useState<TranslationRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<TranslationRecord | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      setView('login')
    } else if (!authLoading && user && view === 'login') {
      setView('main')
    }
  }, [authLoading, user, view])

  const handleGoToProfile = () => setView('profile')
  const handleBackToMain = () => setView('main')
  const handleGoToHistory = async () => {
    setView('history')
    setHistoryLoading(true)
    try {
      const records = await getTranslationHistory(20, 0)
      setHistory(records)
    } catch (err) {
      console.error('Failed to load history:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

  // 翻译图片的核心函数
  const translateImage = async (base64Image: string, accessToken: string) => {
    setStatus('loading')
    setResult(null)
    setError('')
    
    try {
      console.log('[translateImage] calling translateImageViaEdge...')
      const translateResult = await translateImageViaEdge(base64Image, accessToken)
      console.log('[translateImage] result:', translateResult)
      if (translateResult.error_code === '0' && translateResult.data) {
        setStatus('success')
        setResult({
          image: translateResult.data.pasteImg || '',
          sumSrc: translateResult.data.sumSrc,
          sumDst: translateResult.data.sumDst,
        })
        refreshQuota()
        // 保存历史记录 - 直接从 session 获取 userId，避免闭包问题
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const userId = currentSession?.user?.id
        if (userId) {
          console.log('[translateImage] saving history for user:', userId)
          saveTranslation({
            user_id: userId,
            source_text: translateResult.data.sumSrc || null,
            translated_text: translateResult.data.sumDst || null,
            source_lang: 'auto',
            target_lang: 'zh',
            status: 'success',
            image_size: base64Image.length,
            error_message: null,
          }).then(() => {
            console.log('[translateImage] history saved successfully')
          }).catch((err) => {
            console.error('[translateImage] failed to save history:', err)
          })
        } else {
          console.log('[translateImage] skipping history save, no userId from session')
        }
      } else {
        setStatus('error')
        setError(translateResult.error_msg || '翻译失败')
      }
    } catch (err) {
      setStatus('error')
      setError((err as Error).message || '翻译失败')
    }
  }

  // 登录成功后，处理待翻译的图片
  useEffect(() => {
    if (!session?.access_token || !pendingImage) return
    
    console.log('[useEffect] processing pending image after login')
    const imageToProcess = pendingImage
    setPendingImage(null)
    
    // 先检查配额再翻译
    checkAndUseQuota().then(quotaResult => {
      if (!quotaResult.success) {
        setError(quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败')
        setStatus('error')
        refreshQuota()
        return
      }
      translateImage(imageToProcess, session.access_token)
    })
  }, [session, pendingImage])

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onScreenshotCaptured(async (base64Image) => {
      console.log('[onScreenshotCaptured] received image, length:', base64Image?.length)
      setResult(null)
      setError('')

      // 直接从 Supabase 获取最新 session
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      console.log('[onScreenshotCaptured] current session:', !!currentSession)
      
      if (!currentSession?.access_token) {
        // 未登录时，缓存截图，等待登录后处理
        console.log('[onScreenshotCaptured] not logged in, caching image')
        setPendingImage(base64Image)
        setStatus('idle')
        setError('请先登录后再翻译')
        return
      }

      // 已登录，直接翻译
      await translateImage(base64Image, currentSession.access_token)
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
  }, [refreshQuota])

  const handleCopy = () => {
    if (result?.image) {
      window.electronAPI.copyImage(result.image)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleCapture = async () => {
    console.log('[handleCapture] user:', !!user, 'session:', !!session)
    if (!user) {
      setView('login')
      return
    }
    console.log('[handleCapture] checking quota...')
    const quotaResult = await checkAndUseQuota()
    console.log('[handleCapture] quotaResult:', quotaResult)
    if (!quotaResult.success) {
      setError(quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败')
      setStatus('error')
      refreshQuota()
      return
    }
    console.log('[handleCapture] calling captureScreen')
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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setAuthError('请填写邮箱和密码')
      return
    }
    setAuthError('')
    setAuthSubmitting(true)
    
    const { error } = authMode === 'login' 
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password)
    
    setAuthSubmitting(false)
    if (error) {
      setAuthError(error.message)
    } else if (authMode === 'register') {
      setAuthError('')
      setAuthMode('login')
      setPassword('')
      alert('注册成功，请查收验证邮件后登录')
    }
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
          <h2 className="text-white text-lg font-medium">
            {authMode === 'login' ? '登录' : '注册'}以使用翻译服务
          </h2>
          <p className="text-white/50 text-xs text-center">免费用户每日 20 次翻译配额</p>

          {authError && <p className="text-red-400 text-xs">{authError}</p>}

          <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3 w-full max-w-[220px]">
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm placeholder-white/40 outline-none focus:ring-1 focus:ring-white/30"
            />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full py-2 px-3 rounded-lg bg-white/10 text-white text-sm placeholder-white/40 outline-none focus:ring-1 focus:ring-white/30"
            />
            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full py-2 px-4 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/40 text-white text-sm transition-colors"
            >
              {authSubmitting ? '处理中...' : (authMode === 'login' ? '登录' : '注册')}
            </button>
          </form>

          <button
            onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}
            className="text-white/50 hover:text-white/70 text-xs"
          >
            {authMode === 'login' ? '没有账号？注册' : '已有账号？登录'}
          </button>

          <div className="flex items-center gap-3 w-full max-w-[220px]">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-white/40 text-xs">或</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <button
            onClick={() => handleOAuthLogin('github')}
            className="w-full max-w-[220px] py-2 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            GitHub 登录
          </button>
        </div>
      </div>
    )
  }

  if (view === 'profile') {
    const userEmail = user?.email || '未知'
    const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || userEmail.split('@')[0]
    const avatarUrl = user?.user_metadata?.avatar_url
    const provider = user?.app_metadata?.provider || '未知'
    const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'

    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
        <div
          className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <button
            onClick={handleBackToMain}
            className="text-white/60 hover:text-white/80 text-xs"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            ← 返回
          </button>
          <span className="text-white/80 text-sm font-medium">个人中心</span>
          <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center p-6 gap-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="头像" className="w-16 h-16 rounded-full border-2 border-white/20" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center text-white/60 text-2xl">
              {userName.charAt(0).toUpperCase()}
            </div>
          )}
          <h2 className="text-white text-lg font-medium">{userName}</h2>

          <div className="w-full max-w-[240px] space-y-3 text-sm">
            <div className="flex justify-between text-white/60">
              <span>邮箱</span>
              <span className="text-white/80 truncate max-w-[140px]">{userEmail}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>登录方式</span>
              <span className="text-white/80 capitalize">{provider}</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>注册时间</span>
              <span className="text-white/80">{createdAt}</span>
            </div>
            {quota?.success && (
              <>
                <div className="flex justify-between text-white/60">
                  <span>套餐类型</span>
                  <span className="text-white/80 capitalize">{quota.plan || 'free'}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>今日配额</span>
                  <span className={quota.remaining === 0 ? 'text-red-400' : 'text-white/80'}>
                    {quota.remaining}/{quota.daily_limit}
                  </span>
                </div>
              </>
            )}
            <button
              onClick={handleGoToHistory}
              className="w-full py-2 mt-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 text-sm transition-colors"
            >
              翻译历史 →
            </button>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-glass-border">
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    )
  }

  if (view === 'history') {
    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
        <div
          className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setView('profile')}
            className="text-white/60 hover:text-white/80 text-xs"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            ← 返回
          </button>
          <span className="text-white/80 text-sm font-medium">翻译历史</span>
          <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {historyLoading ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-white/60 text-sm flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                加载中...
              </span>
            </div>
          ) : history.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <span className="text-white/40 text-sm">暂无翻译记录</span>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {history.map((record) => (
                <div
                  key={record.id}
                  onClick={() => { setSelectedRecord(record); setView('historyDetail') }}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-white/40 text-xs">
                      {new Date(record.created_at).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`text-xs ${record.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                      {record.status === 'success' ? '成功' : '失败'}
                    </span>
                  </div>
                  {record.source_text && (
                    <p className="text-white/60 text-xs truncate">{record.source_text}</p>
                  )}
                  {record.translated_text && (
                    <p className="text-white/80 text-sm truncate mt-1">{record.translated_text}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  if (view === 'historyDetail' && selectedRecord) {
    const copyText = (text: string) => {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }

    return (
      <div className="h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
        <div
          className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setView('history')}
            className="text-white/60 hover:text-white/80 text-xs"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            ← 返回
          </button>
          <span className="text-white/80 text-sm font-medium">翻译详情</span>
          <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">
              {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
            </span>
            <span className={selectedRecord.status === 'success' ? 'text-green-400' : 'text-red-400'}>
              {selectedRecord.status === 'success' ? '翻译成功' : '翻译失败'}
            </span>
          </div>

          {selectedRecord.source_text && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">原文</span>
                <button
                  onClick={() => copyText(selectedRecord.source_text!)}
                  className="text-white/40 hover:text-white/60 text-xs"
                >
                  复制
                </button>
              </div>
              <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-lg p-3">
                {selectedRecord.source_text}
              </p>
            </div>
          )}

          {selectedRecord.translated_text && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-xs">译文</span>
                <button
                  onClick={() => copyText(selectedRecord.translated_text!)}
                  className="text-white/40 hover:text-white/60 text-xs"
                >
                  {copied ? '已复制 ✓' : '复制'}
                </button>
              </div>
              <p className="text-white/90 text-sm leading-relaxed bg-white/5 rounded-lg p-3">
                {selectedRecord.translated_text}
              </p>
            </div>
          )}

          <div className="text-white/30 text-xs pt-2">
            {selectedRecord.source_lang} → {selectedRecord.target_lang}
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
            onClick={handleGoToProfile}
            className="text-white/40 hover:text-white/60 text-xs"
          >
            我的
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
