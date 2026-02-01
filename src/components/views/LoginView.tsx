import { useAuthStore } from '../../store/authStore'
import { useAuthFormStore } from '../../store/authFormStore'
import { useAppStore } from '../../store/appStore'
import { WindowControls } from '../WindowControls'

export function LoginView() {
  const { signInWithEmail, signUpWithEmail, signInWithOAuth } = useAuthStore()
  const { 
    mode, email, password, error, isSubmitting,
    setMode, setEmail, setPassword, setError, setSubmitting, reset 
  } = useAuthFormStore()
  const { platform, isPinned, togglePin } = useAppStore()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('请填写邮箱和密码')
      return
    }
    setError('')
    setSubmitting(true)
    
    if (mode === 'login') {
      const { error } = await signInWithEmail(email, password)
      setSubmitting(false)
      if (error) {
        const msg = error.message.toLowerCase()
        if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
          setError('邮箱或密码错误')
        } else if (msg.includes('email not confirmed')) {
          setError('邮箱未验证，请查收验证邮件')
        } else {
          setError(error.message)
        }
      }
    } else {
      const { error, isExistingUser } = await signUpWithEmail(email, password)
      setSubmitting(false)
      if (error) {
        setError(error.message)
      } else if (isExistingUser) {
        setError('该邮箱已注册，请直接登录')
        setMode('login')
        setPassword('')
      } else {
        setError('')
        setMode('login')
        setPassword('')
        alert('注册成功，请查收验证邮件后登录')
      }
    }
  }

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    setError('')
    const { error } = await signInWithOAuth(provider)
    if (error) setError(error.message)
  }

  const handleClose = () => window.electronAPI?.closeWindow()
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()

  return (
    <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
      <div
        className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {platform === 'darwin' && (
          <WindowControls
            platform={platform}
            onClose={handleClose}
            onMinimize={handleMinimize}
            onMaximize={handleMaximize}
          />
        )}
        <span className="text-white/80 text-sm font-medium">LiteTrans</span>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePin}
            className={`text-xs transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'}`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            title={isPinned ? '取消置顶' : '窗口置顶'}
          >
            📌
          </button>
          {platform !== 'darwin' && (
            <WindowControls
              platform={platform}
              onClose={handleClose}
              onMinimize={handleMinimize}
              onMaximize={handleMaximize}
            />
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
        <h2 className="text-white text-lg font-medium">
          {mode === 'login' ? '登录' : '注册'}以使用翻译服务
        </h2>
        <p className="text-white/50 text-xs text-center">免费用户每日 20 次翻译配额</p>

        {error && <p className="text-red-400 text-xs">{error}</p>}

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
            disabled={isSubmitting}
            className="w-full py-2 px-4 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:bg-white/10 disabled:text-white/40 text-white text-sm transition-colors"
          >
            {isSubmitting ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
          </button>
        </form>

        <button
          onClick={() => { 
            setMode(mode === 'login' ? 'register' : 'login')
            setError('') 
          }}
          className="text-white/50 hover:text-white/70 text-xs"
        >
          {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
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
