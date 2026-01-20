import { useState, useEffect } from 'react'

type AppStatus = 'idle' | 'capturing' | 'translating' | 'success' | 'error'
type ViewMode = 'main' | 'settings'

interface TranslateResult {
  image: string
  sumSrc?: string
  sumDst?: string
}

interface AppConfig {
  appid: string
  secret: string
  fromLang: string
  toLang: string
}

interface LangOption {
  code: string
  name: string
}

declare global {
  interface Window {
    electronAPI: {
      onCaptureStart: (callback: () => void) => void
      onTranslateStart: (callback: () => void) => void
      onTranslateResult: (callback: (result: TranslateResult) => void) => void
      onTranslateError: (callback: (error: string) => void) => void
      captureScreen: () => void
      copyImage: (base64: string) => void
      closeWindow: () => void
      getConfig: () => Promise<AppConfig>
      saveConfig: (config: Partial<AppConfig>) => Promise<AppConfig>
      getSupportedLangs: () => Promise<LangOption[]>
    }
  }
}

function App() {
  const [view, setView] = useState<ViewMode>('main')
  const [status, setStatus] = useState<AppStatus>('idle')
  const [result, setResult] = useState<TranslateResult | null>(null)
  const [error, setError] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [langs, setLangs] = useState<LangOption[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.getConfig().then(setConfig)
    window.electronAPI.getSupportedLangs().then(setLangs)

    window.electronAPI.onCaptureStart(() => {
      setStatus('capturing')
      setResult(null)
      setError('')
    })

    window.electronAPI.onTranslateStart(() => {
      setStatus('translating')
    })

    window.electronAPI.onTranslateResult((data) => {
      setStatus('success')
      setResult(data)
    })

    window.electronAPI.onTranslateError((err) => {
      setStatus('error')
      setError(err)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'settings') {
          setView('main')
        } else {
          window.electronAPI.closeWindow()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [view])

  const handleCopy = () => {
    if (result?.image) {
      window.electronAPI.copyImage(result.image)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleCapture = () => {
    window.electronAPI.captureScreen()
  }

  const handleClose = () => {
    window.electronAPI.closeWindow()
  }

  const handleSaveConfig = async () => {
    if (!config) return
    setSaving(true)
    try {
      const updated = await window.electronAPI.saveConfig(config)
      setConfig(updated)
      setView('main')
    } finally {
      setSaving(false)
    }
  }

  if (view === 'settings') {
    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col">
        <div
          className="h-9 flex items-center justify-between px-3 bg-black/20 cursor-move"
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
          <span className="text-white/80 text-sm font-medium">设置</span>
          <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
            <button
              onClick={() => setView('main')}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors"
            />
            <button
              onClick={handleClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-auto">
          <div>
            <label className="text-white/60 text-xs block mb-1">AppID</label>
            <input
              type="text"
              value={config?.appid || ''}
              onChange={(e) => setConfig(c => c ? { ...c, appid: e.target.value } : c)}
              placeholder="百度翻译 AppID"
              className="w-full px-3 py-2 bg-white/5 border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-white/60 text-xs block mb-1">Secret Key</label>
            <input
              type="password"
              value={config?.secret || ''}
              onChange={(e) => setConfig(c => c ? { ...c, secret: e.target.value } : c)}
              placeholder="百度翻译密钥"
              className="w-full px-3 py-2 bg-white/5 border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/60 text-xs block mb-1">源语言</label>
              <select
                value={config?.fromLang || 'auto'}
                onChange={(e) => setConfig(c => c ? { ...c, fromLang: e.target.value } : c)}
                className="w-full px-3 py-2 bg-white/5 border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {langs.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/60 text-xs block mb-1">目标语言</label>
              <select
                value={config?.toLang || 'zh'}
                onChange={(e) => setConfig(c => c ? { ...c, toLang: e.target.value } : c)}
                className="w-full px-3 py-2 bg-white/5 border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                {langs.filter(l => l.code !== 'auto').map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-glass-border">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="w-full py-2 rounded-full bg-blue-500/80 hover:bg-blue-500 disabled:bg-blue-500/50 text-white text-sm transition-colors"
          >
            {saving ? '保存中...' : '保存设置'}
          </button>
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
            onClick={() => setView('settings')}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors"
            title="设置"
          />
          <button
            onClick={handleClose}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors"
          />
        </div>
      </div>

      {/* 状态指示 */}
      <div className="px-4 py-2 border-b border-glass-border">
        {status === 'idle' && (
          <span className="text-white/60 text-xs">按 Alt+Q 截图翻译</span>
        )}
        {status === 'capturing' && (
          <span className="text-yellow-400 text-xs flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            截图中...
          </span>
        )}
        {status === 'translating' && (
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
          className="flex-1 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 text-sm transition-colors"
        >
          重新截图
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
