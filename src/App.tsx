import { useEffect, useRef, Suspense, lazy } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { useAppStore } from './store/appStore'
import { useTranslationStore } from './store/translationStore'
import { LoginView } from './components/views/LoginView'
import { MainView } from './components/views/MainView'
import { AppLayout } from './components/layout/AppLayout'

// Lazy load non-critical views
const ProfileView = lazy(() => import('./components/views/ProfileView').then(module => ({ default: module.ProfileView })))
const HistoryView = lazy(() => import('./components/views/HistoryView').then(module => ({ default: module.HistoryView })))
const HistoryDetailView = lazy(() => import('./components/views/HistoryDetailView').then(module => ({ default: module.HistoryDetailView })))

function App() {
  const { view, targetLang, init: initApp, setView } = useAppStore()
  const { user, session, loading: authLoading } = useAuth()
  const { 
    setResult, setStatus, setError, setLastImage, setPendingImage, 
    setUpdateInfo, setShowUpdateToast, translateImage 
  } = useTranslationStore()
  
  // Ref for targetLang to access latest value in async callbacks/effects
  const targetLangRef = useRef(targetLang)

  useEffect(() => {
    targetLangRef.current = targetLang
  }, [targetLang])

  // Initialize app state (platform, shortcuts, pinned state)
  useEffect(() => {
    initApp()
  }, [])

  // View routing based on auth state
  useEffect(() => {
    if (!authLoading && !user) {
      if (view !== 'login') setView('login')
    } else if (!authLoading && user && view === 'login') {
      setView('main')
    }
  }, [authLoading, user, view])

  // Effect to handle pending image after login
  // Note: pendingImage needs to be accessed from store
  const pendingImage = useTranslationStore(s => s.pendingImage)
  
  useEffect(() => {
    if (!session?.access_token || !user?.id || !pendingImage) return
    
    const imageToProcess = pendingImage
    setPendingImage(null)
    
    // Delegate to store which handles loading, quota, and translation
    translateImage(imageToProcess, user.id, session.access_token, targetLangRef.current)
  }, [session, user, pendingImage, setPendingImage, translateImage])

  // Global Event Listeners
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onScreenshotCaptured((base64Image) => {
      console.log('[onScreenshotCaptured] received image')
      // Reset UI state locally or rely on store (store.translateImage resets status/result)
      // But we need to switch view and update lastImage
      setResult(null)
      setView('main')
      setLastImage(base64Image)

      supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
        if (!currentSession?.access_token || !currentSession?.user?.id) {
          console.log('[onScreenshotCaptured] not logged in, caching')
          setPendingImage(base64Image)
          setStatus('idle')
          setError('请先登录后再翻译')
          return
        }

        // Delegate to store
        translateImage(base64Image, currentSession.user.id, currentSession.access_token, targetLangRef.current)
      })
    })

    window.electronAPI.onTranslateError((err) => {
      setStatus('error')
      setError(err)
    })

    window.electronAPI.onUpdateAvailable?.((info) => {
      setUpdateInfo(info)
      setShowUpdateToast(true)
    })

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        window.electronAPI.closeWindow()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      // Cleanup listeners if electronAPI provides unsubscribe or just relies on overwriting callbacks
      // The current implementation in preload might not support multiple listeners well or unsubscribe
      // Assuming callbacks are overwritten or we don't need strict cleanup for single instance app
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    setView, setLastImage, setResult, setPendingImage, setStatus, setError, 
    translateImage, setUpdateInfo, setShowUpdateToast
  ])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-glass-bg backdrop-blur-glass rounded-2xl border border-glass-border flex items-center justify-center">
        <span className="text-white/60 text-sm flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white/40 border-t-transparent rounded-full animate-spin" />
          加载中...
        </span>
      </div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen w-screen bg-glass-bg backdrop-blur-glass">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    }>
      {view === 'login' ? (
        <LoginView />
      ) : (
        <AppLayout>
          <div className="w-full h-full view-transition relative">
            {view === 'main' && <MainView />}
            {view === 'profile' && <ProfileView />}
            {view === 'history' && <HistoryView />}
            {view === 'historyDetail' && <HistoryDetailView />}
          </div>
        </AppLayout>
      )}
    </Suspense>
  )
}

export default App
