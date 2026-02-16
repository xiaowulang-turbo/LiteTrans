import { useEffect, Suspense, lazy } from 'react'
import { useAuthStore } from './store/authStore'
import { useAppStore } from './store/appStore'
import { useTranslationStore } from './store/translationStore'
import { useIpcListeners } from './hooks/useIpcListeners'
import { LoginView } from './components/views/LoginView'
import { MainView } from './components/views/MainView'
import { AppLayout } from './components/layout/AppLayout'

// Lazy load non-critical views
const ProfileView = lazy(() => import('./components/views/ProfileView').then(module => ({ default: module.ProfileView })))
const HistoryView = lazy(() => import('./components/views/HistoryView').then(module => ({ default: module.HistoryView })))
const HistoryDetailView = lazy(() => import('./components/views/HistoryDetailView').then(module => ({ default: module.HistoryDetailView })))

function App() {
  const { view, init: initApp } = useAppStore()
  const { user, session, loading: authLoading, initialize } = useAuthStore()
  const { setPendingImage, translateImage } = useTranslationStore()

  useIpcListeners()

  useEffect(() => {
    const cleanup = initialize()
    return cleanup
  }, [initialize])

  useEffect(() => {
    initApp()
  }, [initApp])

  useEffect(() => {
    if (!authLoading && !user && view !== 'login') {
      useAppStore.getState().setView('login')
    } else if (!authLoading && user && view === 'login') {
      useAppStore.getState().setView('main')
    }
  }, [authLoading, user, view])

  const pendingImage = useTranslationStore(s => s.pendingImage)
  const targetLang = useAppStore(s => s.targetLang)

  useEffect(() => {
    if (!session?.access_token || !user?.id || !pendingImage) return

    const imageToProcess = pendingImage
    setPendingImage(null)
    translateImage(imageToProcess, user.id, session.access_token, targetLang)
  }, [session, user, pendingImage, setPendingImage, translateImage, targetLang])

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
