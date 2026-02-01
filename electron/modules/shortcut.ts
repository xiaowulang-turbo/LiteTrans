import { globalShortcut, app } from 'electron'
import path from 'path'
import fs from 'fs'

export const PRESET_SHORTCUTS = ['Alt+Q', 'Alt+T', 'Alt+S', 'CommandOrControl+Shift+T', 'CommandOrControl+Shift+S']

let currentShortcut: string = 'Alt+Q'

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json')
}

function loadConfig(): { shortcut: string } {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      return { shortcut: data.shortcut || 'Alt+Q' }
    }
  } catch (e) {
    console.error('[loadConfig] error:', e)
  }
  return { shortcut: 'Alt+Q' }
}

function saveConfig(config: { shortcut: string }) {
  try {
    fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2))
  } catch (e) {
    console.error('[saveConfig] error:', e)
  }
}

export function registerShortcuts(captureCallback: () => void, showWindowCallback: () => void) {
  const config = loadConfig()
  currentShortcut = config.shortcut
  
  if (!globalShortcut.register(currentShortcut, captureCallback)) {
    console.error('[registerShortcuts] failed to register:', currentShortcut)
    if (currentShortcut !== 'Alt+Q') {
      currentShortcut = 'Alt+Q'
      globalShortcut.register(currentShortcut, captureCallback)
    }
  }
  console.log('[registerShortcuts] registered:', currentShortcut)

  if (!globalShortcut.register('Alt+Shift+Q', showWindowCallback)) {
    console.error('[registerShortcuts] failed to register Alt+Shift+Q')
  }
}

export function updateShortcut(newShortcut: string, captureCallback: () => void): { success: boolean; shortcut: string } {
  if (!PRESET_SHORTCUTS.includes(newShortcut)) {
    return { success: false, shortcut: currentShortcut }
  }
  
  globalShortcut.unregister(currentShortcut)
  
  if (globalShortcut.register(newShortcut, captureCallback)) {
    currentShortcut = newShortcut
    saveConfig({ shortcut: newShortcut })
    console.log('[updateShortcut] updated to:', newShortcut)
    return { success: true, shortcut: newShortcut }
  }
  
  globalShortcut.register(currentShortcut, captureCallback)
  console.error('[updateShortcut] failed to register:', newShortcut)
  return { success: false, shortcut: currentShortcut }
}

export function getCurrentShortcut(): string {
  return currentShortcut
}

export function unregisterAllShortcuts() {
  globalShortcut.unregisterAll()
}
