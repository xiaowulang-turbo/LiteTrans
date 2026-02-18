import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface VersionCheckResult {
  allowed: boolean
  reason?: 'force_update' | 'blocked'
  message?: string
  update_url?: string
  latest_version?: string
}

export function useVersionCheck() {
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // 获取当前版本
        const appVersion = window.electronAPI?.getAppVersion?.() || 'unknown'

        // 调用 RPC 检查版本
        const { data, error } = await supabase.rpc('check_app_version', {
          app_version: appVersion,
        })

        if (error) {
          console.error('[useVersionCheck] error:', error)
          setIsChecking(false)
          return
        }

        const result = data as unknown as VersionCheckResult
        setVersionCheck(result)
        setIsChecking(false)

        // 如果不允许使用，通知主进程
        if (!result.allowed) {
          // 通过 IPC 通知主进程显示阻断弹窗
          // 注意：这里我们依赖 VersionBlocker 组件来显示 UI
        }
      } catch (err) {
        console.error('[useVersionCheck] error:', err)
        setIsChecking(false)
      }
    }

    checkVersion()
  }, [])

  return { versionCheck, isChecking }
}
