import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not configured')
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || ''
)

export interface UserProfile {
  id: string
  plan: 'free' | 'pro' | 'enterprise'
  daily_limit: number
  daily_used: number
  last_used_date: string
  expire_at: string | null
  created_at: string
  updated_at: string
}

export interface TranslationRecord {
  id: string
  user_id: string
  source_lang: string
  target_lang: string
  source_text: string | null
  translated_text: string | null
  image_size: number | null
  status: 'success' | 'failed'
  error_message: string | null
  created_at: string
}

export interface QuotaInfo {
  success: boolean
  error?: string
  plan?: string
  daily_limit?: number
  daily_used?: number
  remaining?: number
}

export async function getUserQuota(): Promise<QuotaInfo> {
  const { data, error } = await supabase.rpc('get_user_quota')
  if (error) {
    return { success: false, error: error.message }
  }
  return data as QuotaInfo
}

export async function checkAndUseQuota(): Promise<QuotaInfo> {
  const { data, error } = await supabase.rpc('check_and_use_quota')
  if (error) {
    return { success: false, error: error.message }
  }
  return data as QuotaInfo
}

export async function saveTranslation(record: Omit<TranslationRecord, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('translation_history')
    .insert(record)
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function getTranslationHistory(limit = 20, offset = 0) {
  const { data, error } = await supabase
    .from('translation_history')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return data as TranslationRecord[]
}
