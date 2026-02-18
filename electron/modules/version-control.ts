import { app, dialog, shell, ipcMain } from 'electron'
import { showAndFocusWindow, mainWindow } from './window'

interface VersionCheckResult {
  allowed: boolean
  reason?: 'force_update' | 'blocked'
  message?: string
  update_url?: string
  latest_version?: string
}

// 存储最近一次版本检查结果
let lastVersionCheckResult: VersionCheckResult | null = null

/**
 * 从渲染进程接收版本检查结果
 */
export function setupVersionControlIPC() {
  ipcMain.handle('check-app-version', async () => {
    return app.getVersion()
  })

  ipcMain.on('version-check-result', (_event, result: VersionCheckResult) => {
    lastVersionCheckResult = result
    if (!result.allowed) {
      showVersionBlockedDialog(result)
    }
  })
}

/**
 * 检查应用版本是否允许使用
 * 启动时调用，渲染进程加载后异步检查
 */
export async function checkAppVersionOnStartup(): Promise<boolean> {
  // 启动时暂不阻断，等待渲染进程完成检查
  // 主进程启动时环境变量不可用，需要依赖渲染进程
  return true
}

function showVersionBlockedDialog(result: VersionCheckResult) {
  showAndFocusWindow(mainWindow)

  const response = dialog.showMessageBoxSync(mainWindow!, {
    type: 'warning',
    title: '版本已过期',
    message: result.message || '请更新到最新版本',
    detail: `当前版本: ${app.getVersion()}\n最新版本: ${result.latest_version}`,
    buttons: ['立即下载', '退出'],
    defaultId: 0,
    cancelId: 1,
  })

  if (response === 0 && result.update_url) {
    shell.openExternal(result.update_url)
  }

  app.quit()
}

/**
 * 获取最近一次版本检查结果
 */
export function getLastVersionCheckResult(): VersionCheckResult | null {
  return lastVersionCheckResult
}

/**
 * 发送版本被阻止事件到渲染进程
 */
export function notifyVersionBlocked(result: VersionCheckResult) {
  mainWindow?.webContents.send('version-blocked', result)
}
