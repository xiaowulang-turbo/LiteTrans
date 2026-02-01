

interface SidebarProps {
  currentView: string
  onChangeView: (view: 'main' | 'history' | 'profile') => void
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
  const menuItems = [
    { id: 'main', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', label: '翻译' },
    { id: 'history', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', label: '历史' },
    { id: 'profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', label: '我的' },
  ] as const

  return (
    <div className="w-[68px] flex flex-col items-center py-4 bg-black/10 border-r border-white/5">
      <div className="flex flex-col gap-2 w-full px-2">
        {menuItems.map((item) => {
          const isActive = currentView === item.id || (item.id === 'history' && currentView === 'historyDetail')
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as any)}
              className={`
                group relative flex flex-col items-center justify-center w-full aspect-square rounded-xl transition-all duration-200
                ${isActive 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                }
              `}
              title={item.label}
            >
              <svg 
                className={`w-6 h-6 mb-1 transition-transform group-hover:scale-110 ${isActive ? 'scale-110' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor" 
                strokeWidth={isActive ? 2 : 1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className={`text-[10px] font-medium ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                {item.label}
              </span>
              
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />
              )}
            </button>
        )})}
      </div>
    </div>
  )
}
