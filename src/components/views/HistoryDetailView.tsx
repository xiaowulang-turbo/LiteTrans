import { useState, useEffect } from 'react'
import { useTranslationStore } from '../../store/translationStore'
import { useAppStore } from '../../store/appStore'

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

  const { setView } = useAppStore()
  const [copied, setCopied] = useState(false)



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
    <div className="h-full w-full flex flex-col p-4">
      <div className="flex items-center mb-4">
        <button
          onClick={() => setView('history')}
          className="text-white/50 hover:text-white/80 flex items-center gap-1 text-sm bg-white/5 px-2 py-1 rounded"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          返回
        </button>
        <span className="ml-4 text-white/80 font-medium">翻译详情</span>
      </div>


      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/40">
            {new Date(selectedRecord.created_at).toLocaleString('zh-CN')}
          </span>
          <span className={selectedRecord.status === 'success' ? 'text-green-400' : 'text-red-400'}>
            {selectedRecord.status === 'success' ? '翻译成功' : '翻译失败'}
          </span>
        </div>

        {/* 翻译结果图片 */}
        {selectedRecord.image_path ? (
          <div className="space-y-2">
            <span className="text-white/50 text-xs">翻译图片</span>
            <div 
              className="relative rounded-lg bg-white/5 flex items-center justify-center overflow-hidden cursor-pointer group"
              style={{ minHeight: '120px' }}
              onClick={detailImageUrl ? handleOpenPreview : undefined}
            >
              {/* 骨架屏 / 加载状态 */}
              {(!detailImageUrl || imageLoading) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-white/5">
                  <span className="w-8 h-8 border-2 border-white/30 border-t-white/70 rounded-full animate-spin mb-2" />
                  <span className="text-white/40 text-xs">加载图片...</span>
                </div>
              )}
              
              {/* 图片 */}
              {detailImageUrl && (
                <img
                  src={detailImageUrl}
                  alt="翻译结果"
                  className={`w-full max-h-[40vh] rounded-lg object-contain transition-all duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100 group-hover:opacity-90'}`}
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                  title="点击放大"
                />
              )}
              
              {/* 悬停提示 */}
              {detailImageUrl && !imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <span className="bg-black/50 text-white/80 text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
                    点击放大
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-white/50 text-xs">翻译图片</span>
            <div className="rounded-lg bg-white/5 border border-dashed border-white/20 flex flex-col items-center justify-center py-8">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/30 mb-2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span className="text-white/40 text-xs">暂无图片</span>
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
