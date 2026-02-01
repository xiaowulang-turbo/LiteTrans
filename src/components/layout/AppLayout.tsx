import React from 'react'
import { Sidebar } from './Sidebar'
import { WindowControls } from '../WindowControls'
import { useAppStore } from '../../store/appStore'

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { view, setView, platform, isPinned, togglePin } = useAppStore()

  const handleClose = () => window.electronAPI?.closeWindow()
  const handleMinimize = () => window.electronAPI?.minimizeWindow()
  const handleMaximize = () => window.electronAPI?.maximizeWindow()

  return (
    <div className="h-screen w-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border overflow-hidden flex flex-col text-white select-none">
      {/* Global Title Bar */}
      <div
        className="h-9 relative flex items-center justify-between px-3 bg-black/20 cursor-move shrink-0 z-50 transition-colors hover:bg-black/30"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Left Section: macOS Traffic Lights or Icon/Logo */}
        <div className="flex items-center gap-2 min-w-[80px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {platform === 'darwin' ? (
             <WindowControls
               platform={platform}
               onClose={handleClose}
               onMinimize={handleMinimize}
               onMaximize={handleMaximize}
             />
          ) : (
            <div className="flex items-center gap-2 pl-1 opacity-80">
              {/* Optional: App Icon here if desired */}
              <span className="text-xs font-bold tracking-wider text-blue-400">LITETRANS</span>
            </div>
          )}
        </div>

        {/* Center Section: App Title / Context */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-60">
           {/* Maybe show current view title or just App Name */}
        </div>

        {/* Right Section: Pin + Windows Controls */}
        <div className="flex items-center gap-2 min-w-[80px] justify-end" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button
            onClick={togglePin}
            className={`
              w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-200
              ${isPinned 
                ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_10px_rgba(234,179,8,0.2)]' 
                : 'text-white/40 hover:text-white/80 hover:bg-white/10'
              }
            `}
            title={isPinned ? '取消置顶' : '窗口置顶'}
          >
            <span className={`text-sm transform transition-transform ${isPinned ? 'rotate-45' : 'rotate-0'}`}>📌</span>
          </button>
          
          {platform !== 'darwin' && (
            <div className="pl-3 border-l border-white/10 ml-1">
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

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar currentView={view} onChangeView={setView} />
        
        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-black/5">
          {children}
        </div>
      </div>
      
      {/* Bottom Status Bar (Optional, can be removed if global status not needed. 
          Currently MainView has one. We might want to keep status bar per view 
          or move it global. Let's keep it PER VIEW for now to minimize refactor risk locally,
          or move global if it makes sense. MainView shows quota and shortcut. 
          Let's leave it in MainView content area for now, but design allows moving global later.) 
      */}
    </div>
  )
}
