import { useEffect } from 'react'
import { useHistoryStore } from '../../store/historyStore'
import { useAppStore } from '../../store/appStore'
import { TranslationRecord } from '../../lib/supabase'

interface HistoryListProps {
  history: TranslationRecord[]
  loading: boolean
  onSelect: (record: TranslationRecord) => void
}

export function HistoryView() {
  const { history, historyLoading, loadHistory, setSelectedRecord } = useHistoryStore()
  const { setView } = useAppStore()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const handleSelect = (record: TranslationRecord) => {
    setSelectedRecord(record)
    setView('historyDetail')
  }

  return (
    <HistoryList 
      history={history} 
      loading={historyLoading}
      onSelect={handleSelect}
    />
  )
}

function HistoryList({ history, loading, onSelect }: HistoryListProps) {
  return (
    <div className="h-full w-full flex flex-col p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-white/80 font-medium">翻译历史</h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
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
            {history.map((record: TranslationRecord) => (
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
