import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../store/appStore'
import { useTranslationStore } from '../store/translationStore'

export function useIpcListeners() {
  const { setView, targetLang } = useAppStore()
  const { 
    setResult, setStatus, setError, setLastImage, setPendingImage,
    setUpdateInfo, setShowUpdateToast, translateImage
  } = useTranslationStore()

  const targetLangRef = useRef(targetLang)
  useEffect(() => {
    targetLangRef.current = targetLang
  }, [targetLang])

  useEffect(() => {
    if (!window.electronAPI) return

    window.electronAPI.onScreenshotCaptured((base64Image) => {
      setResult(null)
      setView('main')
      setLastImage(base64Image)

      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (!session?.access_token || !session?.user?.id) {
          setPendingImage(base64Image)
          setStatus('idle')
          setError('请先登录后再翻译')
          return
        }
        translateImage(base64Image, session.user.id, session.access_token, targetLangRef.current)
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
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [setView, setResult, setStatus, setError, setLastImage, setPendingImage, 
      setUpdateInfo, setShowUpdateToast, translateImage])
}
