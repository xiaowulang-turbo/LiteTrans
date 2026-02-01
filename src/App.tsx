import { useEffect, useRef } from 'react'
import { checkAndUseQuota, supabase, saveTranslation, uploadTranslationImage, translateImageViaEdge } from './lib/supabase'
import { useAuthStore } from './store/authStore'
import { useAppStore } from './store/appStore'
import { useTranslationStore } from './store/translationStore'
import { LoginView } from './components/views/LoginView'
import { MainView } from './components/views/MainView'
import { ProfileView } from './components/views/ProfileView'
import { HistoryView } from './components/views/HistoryView'
import { HistoryDetailView } from './components/views/HistoryDetailView'

function App() {
  const { view, targetLang, init: initApp, setView } = useAppStore()
  const { user, session, loading: authLoading, refreshQuota } = useAuthStore()
  const { 
    setResult, setStatus, setError, setLastImage, setPendingImage, 
    setUpdateInfo, setShowUpdateToast 
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

  // 翻译图片的核心函数 - 移到这里是为了复用 Supabase 实例和状态更新逻辑
  // 或者，这部分逻辑其实可以移到 store actions 中，但涉及 Supabase 调用，放在组件层或 lib 层调用更合适
  // 考虑到 heavy logic, 这里保留核心调度，update store
  const translateImage = async (base64Image: string, accessToken: string, toLang: string = targetLang) => {
    setResult(null)
    setError('')
    
    try {
      console.log('[translateImage] calling translateImageViaEdge, target:', toLang)
      const translateResult = await translateImageViaEdge(base64Image, accessToken, 'auto', toLang)
      console.log('[translateImage] result:', translateResult)
      
      if (translateResult.error_code === '0' && translateResult.data) {
        setStatus('success')
        setResult({
          image: translateResult.data?.pasteImg || '',
          sumSrc: translateResult.data?.sumSrc,
          sumDst: translateResult.data?.sumDst,
        })
        refreshQuota()
        
        // 保存历史记录
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        const userId = currentSession?.user?.id
        if (userId && translateResult.data?.pasteImg) {
          uploadTranslationImage(userId, translateResult.data.pasteImg).then(async (imagePath) => {
            await saveTranslation({
              user_id: userId,
              source_text: translateResult.data?.sumSrc || null,
              translated_text: translateResult.data?.sumDst || null,
              source_lang: 'auto',
              target_lang: toLang,
              status: 'success',
              image_size: base64Image.length,
              image_path: imagePath,
              error_message: null,
            })
            console.log('[translateImage] history saved')
          }).catch(console.error)
        }
      } else {
        setStatus('error')
        setError(translateResult.error_msg || '翻译失败')
      }
    } catch (err) {
      setStatus('error')
      setError((err as Error).message || '翻译失败')
    }
  }

  // Effect to handle pending image after login
  // Note: pendingImage needs to be accessed from store
  const pendingImage = useTranslationStore(s => s.pendingImage)
  
  useEffect(() => {
    if (!session?.access_token || !pendingImage) return
    
    const imageToProcess = pendingImage
    setPendingImage(null)
    setStatus('loading')
    
    checkAndUseQuota().then(quotaResult => {
      if (!quotaResult.success) {
        setError(quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败')
        setStatus('error')
        refreshQuota()
        return
      }
      translateImage(imageToProcess, session.access_token, targetLangRef.current)
    })
  }, [session, pendingImage])

  // Global Event Listeners
  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onScreenshotCaptured((base64Image) => {
      console.log('[onScreenshotCaptured] received image')
      setResult(null)
      setError('')
      setView('main')
      setLastImage(base64Image)

      supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
        if (!currentSession?.access_token) {
          console.log('[onScreenshotCaptured] not logged in, caching')
          setPendingImage(base64Image)
          setStatus('idle')
          setError('请先登录后再翻译')
          return
        }

        setStatus('loading')
        const quotaResult = await checkAndUseQuota()
        
        if (!quotaResult.success) {
          setError(quotaResult.error === 'quota_exceeded' ? '今日配额已用完' : quotaResult.error || '配额检查失败')
          setStatus('error')
          refreshQuota()
          return
        }

        translateImage(base64Image, currentSession.access_token, targetLangRef.current)
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
  }, [refreshQuota])

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
    <>
      {view === 'login' && <LoginView />}
      {view === 'main' && <MainView />}
      {view === 'profile' && <ProfileView />}
      {view === 'history' && <HistoryView />}
      {view === 'historyDetail' && <HistoryDetailView />}
      
      {/* Update Toast rendering is moved to MainView or a global Overlay component. 
          Actually, let's keep it in MainView or specific views, or create a GlobalToast component.
          In the original App.tsx, it was rendered overlaying everything.
          To keep it simple, we can rely on stores to trigger it in views, or have it here.
          But App.tsx is now cleaner. Let's assume MainView handles the update toast for now
          as it's the primary view.
          If update toast should appear anywhere, we should wrap children in a Layout.
      */}
    </>
  )
}

export default App
