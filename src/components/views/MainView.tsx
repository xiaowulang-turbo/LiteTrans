import { useTranslationStore } from '../../store/translationStore'
import { useAuthStore } from '../../store/authStore'
import { useAppStore } from '../../store/appStore'
import { WindowControls } from '../WindowControls'

export function MainView() {
  const { 
    status, result, error 
  } = useTranslationStore()
  
  const { user, quota } = useAuthStore()
  const { 
    platform, isPinned, shortcut,
    setView, togglePin 
  } = useAppStore()

  const handleCapture = () => {
    if (!user) {
      setView('login')
      return
    }
    window.electronAPI?.captureScreen()
  }


  const handleCopy = () => {
    if (result?.image) {
      window.electronAPI?.copyImage(result.image)
      // Ideally show a toast nicely
    }
  }
  
  const handleOpenPreview = () => {
    if (result?.image) {
      window.electronAPI?.openPreview(result.image)
    }
  }

  const handleClose = () => window.electronAPI?.closeWindow()
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()

  return (
    <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col relative">
      {/* 标题栏 */}
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
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={togglePin}
            className={`text-xs transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'} outline-none`}
            title={isPinned ? '取消置顶' : '窗口置顶'}
            tabIndex={-1}
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

      {/* 状态栏 */}
      <div className="px-4 py-2 border-b border-glass-border flex items-center justify-between">
        <span className="text-white/60 text-xs">按 {shortcut.replace('CommandOrControl', 'Ctrl')} 截图翻译</span>
        <div className="flex items-center gap-2">
          {quota?.success && (
            <span className={`text-xs ${quota.remaining === 0 ? 'text-red-400' : 'text-white/50'}`}>
              {quota.remaining}/{quota.daily_limit}
            </span>
          )}
          <button
            onClick={() => setView('profile')}
            className="text-white/40 hover:text-white/60 text-xs"
          >
            我的
          </button>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 p-4 flex items-center justify-center min-h-[200px]">
        {status === 'loading' ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-blue-400 text-lg font-medium">翻译中...</span>
          </div>
        ) : status === 'error' ? (
          <div className="flex flex-col items-center gap-3 max-w-[280px]">
            <div className="text-red-400 text-4xl">✗</div>
            <span className="text-red-400 text-base text-center">{error}</span>
            <button 
              onClick={handleCapture}
              className="mt-2 px-6 py-2 rounded-full bg-blue-500/80 hover:bg-blue-500 text-white text-sm transition-colors"
            >
              重新截图
            </button>
          </div>
        ) : result?.image ? (
          <img
            src={`data:image/png;base64,${result.image}`}
            alt="翻译结果"
            className="max-w-full max-h-[400px] rounded-lg object-contain cursor-pointer hover:opacity-90 transition-opacity"
            onClick={handleOpenPreview}
            title="点击放大"
          />
        ) : (
          <div className="text-white/40 text-sm">暂无翻译结果</div>
        )}
      </div>

      {/* 操作栏 */}
      <div className="px-4 py-3 border-t border-glass-border flex gap-2">
        <button
          onClick={handleCapture}
          disabled={quota?.success && quota.remaining === 0}
          className="flex-1 py-2 rounded-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white/80 text-sm transition-colors"
        >
          {quota?.success && quota.remaining === 0 ? '配额已用完' : '重新截图'}
        </button>
        <button
          onClick={handleCopy}
          disabled={!result?.image}
          className="flex-1 py-2 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white text-sm transition-colors"
        >
          复制图片
        </button>
      </div>
    </div>
  )
}
