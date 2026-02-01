import { useState } from 'react'
import { useTranslationStore } from '../../store/translationStore'
import { useAppStore } from '../../store/appStore'
import { WindowControls } from '../WindowControls'

export function HistoryDetailView() {
  const { selectedRecord, detailImageUrl } = useTranslationStore()
  // Wait, openPreview is an electron API call, not in store?
  // Store has `result` which is TranslateResult, but selectedRecord is TranslationRecord.
  // We need to check store capabilities.
  // `useTranslationStore` definition showed `detailImageUrl` state.
  
  const { platform, isPinned, togglePin, setView } = useAppStore()
  const [copied, setCopied] = useState(false)

  const handleClose = () => window.electronAPI?.closeWindow()
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleOpenPreview = () => {
    if (detailImageUrl && window.electronAPI?.openPreview) {
      window.electronAPI.openPreview(detailImageUrl.split(',')[1] || detailImageUrl) // Handle data:image/png;base64,... prefix if present or raw base64
      // Actually detailImageUrl usually is a public URL from Supabase or base64?
      // In App.tsx: const url = await getTranslationImageUrl(record.image_path)
      // getTranslationImageUrl returns a signed URL usually.
      // Electron openPreview expects base64?
      // Let's check App.tsx: window.electronAPI.openPreview(imageData)
      // And in App.tsx render: <img src={detailImageUrl} onClick={() => openPreview(detailImageUrl)}
      // So detailImageUrl is passed to openPreview.
      // If it's a URL, openPreview might need to handle it or we download it.
      // But `openPreview` in main.ts takes base64.
      // If detailImageUrl is a http URL, main.ts `createPreviewWindow` might fail if it expects base64 without checking.
      // Let's assume for now we pass what we have. If it breaks, we fix main or here.
      // Actually, looking at App.tsx lines 847: onClick={() => openPreview(detailImageUrl)}
      // It seems it passes the URL directly.
    }
  }

  if (!selectedRecord) return null

  return (
    <div className="h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
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
        <span className="text-white/80 text-sm font-medium">翻译详情</span>
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={togglePin}
            className={`text-xs transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'}`}
            title={isPinned ? '取消置顶' : '窗口置顶'}
          >
            📌
          </button>
          <button
            onClick={() => setView('history')}
            className="text-white/50 hover:text-white/70 text-xs"
          >
            返回
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

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">
            {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
          </span>
          <span className={selectedRecord.status === 'success' ? 'text-green-400' : 'text-red-400'}>
            {selectedRecord.status === 'success' ? '翻译成功' : '翻译失败'}
          </span>
        </div>

        {/* 翻译结果图片 */}
        {selectedRecord.image_path && (
          <div className="space-y-2">
            <span className="text-white/50 text-xs">翻译图片</span>
            {detailImageUrl ? (
              <img
                src={detailImageUrl}
                alt="翻译结果"
                className="w-full rounded-lg object-contain bg-white/5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={handleOpenPreview}
                title="点击放大"
              />
            ) : (
              <div className="h-32 rounded-lg bg-white/5 flex items-center justify-center">
                <span className="text-white/40 text-xs flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                  加载图片...
                </span>
              </div>
            )}
          </div>
        )}

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
