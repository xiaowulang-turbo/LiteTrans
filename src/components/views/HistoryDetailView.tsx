import { useState, useEffect } from 'react'
import { useTranslationStore } from '../../store/translationStore'
import { useAppStore } from '../../store/appStore'
import { WindowControls } from '../WindowControls'
import { getTranslationImageUrl } from '../../lib/supabase'

export function HistoryDetailView() {
  const { selectedRecord, detailImageUrl, setDetailImageUrl } = useTranslationStore()
  const [imageLoading, setImageLoading] = useState(true)
  
  useEffect(() => {
    if (selectedRecord?.image_path) {
      setDetailImageUrl(null) // Clear previous image immediately
      
      const load = async () => {
        try {
          const path = selectedRecord.image_path!
          
          // 1. Try local cache first
          if (window.electronAPI?.getCachedImage) {
            const cached = await window.electronAPI.getCachedImage(path)
            if (cached) {
              console.log('Loaded from cache')
              setDetailImageUrl(`data:image/png;base64,${cached}`)
              return
            }
          }

          // 2. Fetch signed URL
          const url = await getTranslationImageUrl(path)
          if (!url) {
            console.error('Failed to get info for image')
            return
          }

          // 3. Download and cache (if Electron available)
          if (window.electronAPI?.saveImageToCache) {
            const savedBase64 = await window.electronAPI.saveImageToCache(url, path)
            if (savedBase64) {
              console.log('Downloaded and cached')
              setDetailImageUrl(`data:image/png;base64,${savedBase64}`)
              return
            }
          }

          // 4. Fallback to URL
          console.log('Fallback to URL')
          setDetailImageUrl(url)
        } catch (e) {
          console.error('Failed to load image:', e)
        }
      }
      
      load()
    } else {
      setDetailImageUrl(null)
    }
  }, [selectedRecord, setDetailImageUrl])

  useEffect(() => {
    if (detailImageUrl) {
      setImageLoading(true)
    }
  }, [detailImageUrl])

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
      // Pass the raw URL or base64. Ensure main process handles it.
      // If it's a signed URL, main process might need to fetch it or just load it in BrowserWindow.
      window.electronAPI.openPreview(detailImageUrl)
    }
  }

  if (!selectedRecord) return null

  return (
    <div className="h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
      <div
        className="h-9 relative flex items-center justify-between px-3 bg-black/20 cursor-move"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left Section: Back button + macOS controls */}
        <div className="flex items-center gap-2 min-w-[60px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {platform === 'darwin' ? (
            <div className="flex items-center gap-2">
              <WindowControls
                platform={platform}
                onClose={handleClose}
                onMinimize={handleMinimize}
                onMaximize={handleMaximize}
              />
              <button
                onClick={() => setView('history')}
                className="text-white/50 hover:text-white/70 text-xs ml-2"
              >
                返回
              </button>
            </div>
          ) : (
            <button
              onClick={() => setView('history')}
              className="text-white/50 hover:text-white/70 text-xs flex items-center gap-1"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              返回
            </button>
          )}
        </div>

        {/* Center Section: Title */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="text-white/80 text-sm font-medium">翻译详情</span>
        </div>

        {/* Right Section: Pin + Windows/Linux controls */}
        <div className="flex items-center gap-2 min-w-[60px] justify-end" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={togglePin}
            className={`text-xs transition-colors ${isPinned ? 'text-yellow-400' : 'text-white/40 hover:text-white/60'}`}
            title={isPinned ? '取消置顶' : '窗口置顶'}
          >
            📌
          </button>
          {platform !== 'darwin' && (
            <div className="pl-2 border-l border-white/10 ml-1">
              <WindowControls
                platform={platform}
                onClose={handleClose}
                onMinimize={handleMinimize}
                onMaximize={handleMaximize}
              />
            </div>
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
            <div className="relative min-h-[128px] rounded-lg bg-white/5 flex items-center justify-center overflow-hidden">
              {(!detailImageUrl || imageLoading) && (
                <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/5">
                  <span className="text-white/40 text-xs flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
                    加载图片...
                  </span>
                </div>
              )}
              {detailImageUrl && (
                <img
                  src={detailImageUrl}
                  alt="翻译结果"
                  className={`w-full rounded-lg object-contain cursor-pointer hover:opacity-90 transition-all duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}
                  onClick={handleOpenPreview}
                  onLoad={() => setImageLoading(false)}
                  title="点击放大"
                />
              )}
            </div>
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
