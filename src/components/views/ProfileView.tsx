import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'


export function ProfileView() {
  const { user, quota, signOut } = useAuthStore()
  const { 
    shortcut, targetLang, presetShortcuts,
    setView, setShortcut, setTargetLang 
  } = useAppStore()



  const handleLogout = async () => {
    await signOut()
    setView('login')
  }

  const userEmail = user?.email || '未知'
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || userEmail.split('@')[0]
  const avatarUrl = user?.user_metadata?.avatar_url
  const provider = user?.app_metadata?.provider || '未知'
  const createdAt = user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'

  const handleChangeShortcut = async (newShortcut: string) => {
    if (window.electronAPI?.setShortcut) {
      const result = await window.electronAPI.setShortcut(newShortcut)
      setShortcut(result.shortcut)
    }
  }

  return (
    <div className="w-full h-full flex flex-col items-center overflow-y-auto">


      <div className="w-full max-w-[400px] flex flex-col items-center p-6 gap-4">
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
                <span className="text-white/80">{quota.plan_display || quota.plan || '免费版'}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>今日配额</span>
                <span className={quota.remaining === 0 ? 'text-red-400' : 'text-white/80'}>
                  {quota.remaining}/{quota.daily_limit}
                </span>
              </div>
              {quota.expire_at && (
                <div className="flex justify-between text-white/60">
                  <span>到期时间</span>
                  <span className={new Date(quota.expire_at) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) ? 'text-yellow-400' : 'text-white/80'}>
                    {new Date(quota.expire_at).toLocaleDateString('zh-CN')}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="flex justify-between items-center text-white/60 pt-2 border-t border-white/10">
            <span>截图快捷键</span>
            <select
              value={shortcut}
              onChange={(e) => handleChangeShortcut(e.target.value)}
              className="text-xs bg-white/10 text-white/80 rounded px-2 py-1 outline-none cursor-pointer hover:bg-white/20"
            >
              {presetShortcuts.map((s) => (
                <option key={s} value={s}>{s.replace('CommandOrControl', 'Ctrl')}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-between items-center text-white/60">
            <span>目标语言</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as typeof targetLang)}
              className="text-xs bg-white/10 text-white/80 rounded px-2 py-1 outline-none cursor-pointer hover:bg-white/20"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
              <option value="jp">日本語</option>
              <option value="kor">한국어</option>
            </select>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-2 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
          >
            退出登录
          </button>
        </div>
      </div>
    </div>
  )
}
