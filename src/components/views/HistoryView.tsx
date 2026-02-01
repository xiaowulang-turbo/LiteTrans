import { useEffect } from 'react'
import { useTranslationStore } from '../../store/translationStore'
import { useAppStore } from '../../store/appStore'
import { WindowControls } from '../WindowControls'

export function HistoryView() {
  const { history, historyLoading, loadHistory } = useTranslationStore()
  const { platform, isPinned, togglePin, setView } = useAppStore()
  
  // Local state for detail view logic within HistoryView for now
  // Or we can make HistoryDetailView separate.
  // App.tsx had 'history' and 'historyDetail' as views.
  // Let's implement 'historyDetail' handling inside here or as a sub-view.
  // Since App state has 'historyDetail' view mode, we should probably stick to that?
  // But wait, if HistoryView is just the list, then we need another component for Detail.
  // Or we can handle it internally if we want to simplify the top-level routing.
  // Let's check App.tsx again. It has 'historyDetail'. 
  // For better component separation, let's keep HistoryView for the list, and maybe create HistoryDetailView?
  // Or combine them if the navigation is strictly simple.
  // App.tsx logic: setView('historyDetail')
  
  // Let's stick to the App structure: ViewMode includes 'historyDetail'.
  // But wait, my plan didn't mention HistoryDetailView explicitly.
  // I'll implement HistoryView to handle both or just the list, and assume App switches to it.
  // But App.tsx manages views. So if 'historyDetail' is a top level view, I need a component for it.
  // Let's simplify: HistoryView can handle the list. I'll make HistoryDetailView too if needed.
  // Actually, combining them in one file `HistoryView.tsx` might be cleaner if they share state (selectedRecord).
  // But `selectedRecord` was in App state (useState).
  // I should probably add `selectedRecord` to `translationStore`?
  // Yes, adding `selectedRecord` to translationStore makes sense.
  
  // Let's just create HistoryView and assume it might be used for detail too or handle list.
  // Wait, I need to check translationStore. It might not have `selectedRecord`.
  // Let's assume I strictly follow the plan: "HistoryView: 展示翻译历史列表".
  // So I'll need a HistoryDetailView or handle it inside HistoryView.
  // Let's check `translationStore.ts` content first? No, I recall creating it.
  // I'll invoke `loadHistory` on mount.
  
  useEffect(() => {
    loadHistory()
  }, [])

  const handleClose = () => window.electronAPI?.closeWindow()
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()

  // We need to navigate to detail.
  // Let's use internal state for now if we don't want to change AppStore view modes too much
  // OR we add setSelectedRecord to translationStore.
  
  // For now, I'll put the List and Detail in this file, and export HistoryView. 
  // But App.tsx controls the view. 
  // Let's make HistoryView handle 'history' view.
  // For 'historyDetail', I'll make a separate component HistoryDetailView and export it from here too?
  // Or just export two components.
  
  return (
    <HistoryList 
      history={history} 
      loading={historyLoading}
      onSelect={(record: any) => {
        // We need to set View to historyDetail AND set selected record.
        // If I can't set selected record in store, I can't really pass it easily via App.
        // So I should modify translationStore to hold `selectedRecord`.
        // I will do that in a follow-up step to keep this atomic.
        // For now, let's just scaffold the list view.
        console.log('Select record', record)
      }}
      platform={platform}
      isPinned={isPinned}
      onTogglePin={togglePin}
      onBack={() => setView('profile')}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onMaximize={handleMaximize}
    />
  )
}

function HistoryList({ 
  history, loading, onSelect, platform, isPinned, onTogglePin, onBack,
  onClose, onMinimize, onMaximize 
}: any) {
  return (
    <div className="h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
      <div
        className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <WindowControls
          platform={platform}
          onClose={onClose}
          onMinimize={onMinimize}
          onMaximize={onMaximize}
        />
        <span className="text-white/80 text-sm font-medium">翻译历史</span>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={onTogglePin}
            className={`text-xs transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'}`}
            title={isPinned ? '取消置顶' : '窗口置顶'}
          >
            📌
          </button>
          <button
            onClick={onBack}
            className="text-white/50 hover:text-white/70 text-xs"
          >
            返回
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
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
            {history.map((record: any) => (
              <div
                key={record.id}
                onClick={() => onSelect(record)}
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
