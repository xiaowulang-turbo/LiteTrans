import { app } from 'electron'
import fs from 'fs'
import path from 'path'

export interface AppConfig {
  appid: string
  secret: string
  fromLang: string
  toLang: string
}

const DEFAULT_CONFIG: AppConfig = {
  appid: '',
  secret: '',
  fromLang: 'auto',
  toLang: 'zh',
}

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json')

export function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
    }
  } catch {
    console.error('Failed to load config')
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: Partial<AppConfig>): AppConfig {
  const current = loadConfig()
  const updated = { ...current, ...config }
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2))
  } catch {
    console.error('Failed to save config')
  }
  return updated
}

export function isConfigValid(config: AppConfig): boolean {
  return config.appid.length > 0 && config.secret.length > 0
}

export const SUPPORTED_LANGS = [
  { code: 'auto', name: '自动检测' },
  { code: 'zh', name: '中文' },
  { code: 'en', name: '英语' },
  { code: 'jp', name: '日语' },
  { code: 'kor', name: '韩语' },
  { code: 'fra', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'ru', name: '俄语' },
  { code: 'spa', name: '西班牙语' },
  { code: 'pt', name: '葡萄牙语' },
]
