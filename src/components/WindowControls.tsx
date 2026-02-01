import React from 'react'

interface WindowControlsProps {
  platform: 'win32' | 'darwin' | 'linux'
  onClose: () => void
  onMinimize: () => void
  onMaximize: () => void
}

export function WindowControls({ platform, onClose, onMinimize, onMaximize }: WindowControlsProps) {
  if (platform === 'darwin') {
    return (
      <div className="flex gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={onClose}
          className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors flex items-center justify-center group"
        >
          <span className="text-[8px] text-black/60 opacity-0 group-hover:opacity-100 font-bold leading-none">×</span>
        </button>
        <button
          onClick={onMinimize}
          className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors flex items-center justify-center group"
        >
          <span className="text-[8px] text-black/60 opacity-0 group-hover:opacity-100 font-bold leading-none">−</span>
        </button>
        <button
          onClick={onMaximize}
          className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors flex items-center justify-center group"
        >
          <span className="text-[8px] text-black/60 opacity-0 group-hover:opacity-100 font-bold leading-none">+</span>
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button
        onClick={onMinimize}
        className="w-10 h-9 hover:bg-white/10 transition-colors flex items-center justify-center group outline-none"
        title="最小化"
        tabIndex={-1}
      >
        <svg className="w-3 h-3 text-white/70 group-hover:text-white" fill="currentColor" viewBox="0 0 12 12">
          <rect x="0" y="5" width="12" height="2" />
        </svg>
      </button>
      <button
        onClick={onMaximize}
        className="w-10 h-9 hover:bg-white/10 transition-colors flex items-center justify-center group outline-none"
        title="最大化"
        tabIndex={-1}
      >
        <svg className="w-3 h-3 text-white/70 group-hover:text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 12 12">
          <rect x="2" y="2" width="8" height="8" />
        </svg>
      </button>
      <button
        onClick={onClose}
        className="w-10 h-9 hover:bg-red-600 transition-colors flex items-center justify-center group outline-none"
        title="关闭"
        tabIndex={-1}
      >
        <svg className="w-3 h-3 text-white/70 group-hover:text-white" fill="currentColor" viewBox="0 0 12 12">
          <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
