interface VersionBlockInfo {
  allowed: boolean
  reason?: 'force_update' | 'blocked'
  message?: string
  update_url?: string
  latest_version?: string
}

interface VersionBlockerProps {
  blockInfo: VersionBlockInfo | null
}

export function VersionBlocker({ blockInfo }: VersionBlockerProps) {
  if (!blockInfo) return null

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-[9999]">
      <div className="bg-[#1e1e2e] border border-white/10 rounded-2xl p-8 max-w-md text-center shadow-2xl">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          {blockInfo.reason === 'blocked' ? '版本已停用' : '需要更新'}
        </h2>

        <p className="text-white/60 mb-6 leading-relaxed">
          {blockInfo.message || '请更新到最新版本以继续使用'}
        </p>

        {blockInfo.latest_version && (
          <div className="text-sm text-white/40 mb-6">
            最新版本: <span className="text-white/70">{blockInfo.latest_version}</span>
          </div>
        )}

        <div className="space-y-3">
          {blockInfo.update_url && (
            <button
              onClick={() => window.electronAPI?.openExternal?.(blockInfo.update_url!)}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white rounded-xl font-medium transition-all"
            >
              立即下载更新
            </button>
          )}

          <button
            onClick={() => window.electronAPI?.closeWindow?.()}
            className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-medium transition-all"
          >
            退出应用
          </button>
        </div>
      </div>
    </div>
  )
}
