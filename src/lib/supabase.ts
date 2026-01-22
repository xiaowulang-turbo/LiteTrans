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
  image_path: string | null
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
  console.log('[checkAndUseQuota] calling RPC...')
  const { data, error } = await supabase.rpc('check_and_use_quota')
  console.log('[checkAndUseQuota] result:', { data, error })
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

// 上传翻译结果图片到 Storage
export async function uploadTranslationImage(userId: string, base64Image: string): Promise<string | null> {
  try {
    const fileName = `${userId}/${Date.now()}.png`
    const binaryStr = atob(base64Image)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    
    const { error } = await supabase.storage
      .from('translation-images')
      .upload(fileName, bytes, { contentType: 'image/png', upsert: false })
    
    if (error) {
      console.error('[uploadTranslationImage] error:', error)
      return null
    }
    return fileName
  } catch (err) {
    console.error('[uploadTranslationImage] error:', err)
    return null
  }
}

// 获取图片的签名 URL（有效期 1 小时）
export async function getTranslationImageUrl(imagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('translation-images')
    .createSignedUrl(imagePath, 3600)
  
  if (error) {
    console.error('[getTranslationImageUrl] error:', error)
    return null
  }
  return data.signedUrl
}

export interface TranslateImageResult {
  error_code: string
  error_msg: string
  data?: {
    from: string
    to: string
    sumSrc: string
    sumDst: string
    pasteImg?: string
  }
}

export async function translateImageViaEdge(
  base64Image: string,
  accessToken: string,
  fromLang = 'auto',
  toLang = 'zh'
): Promise<TranslateImageResult> {
  console.log('[translateImageViaEdge] start, image length:', base64Image?.length)
  
  try {
    console.log('[translateImageViaEdge] converting base64 to blob...')
    const binaryStr = atob(base64Image)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'image/png' })
    console.log('[translateImageViaEdge] blob size:', blob.size)

    const formData = new FormData()
    formData.append('image', blob, 'screenshot.png')
    formData.append('from', fromLang)
    formData.append('to', toLang)

    const url = `${supabaseUrl}/functions/v1/translate-image`
    console.log('[translateImageViaEdge] sending request to:', url)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    console.log('[translateImageViaEdge] response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.log('[translateImageViaEdge] error:', errorText)
      return { error_code: '-1', error_msg: errorText || '请求失败' }
    }

    const result = await response.json()
    console.log('[translateImageViaEdge] result:', result)
    return result
  } catch (err: unknown) {
    const error = err as Error
    console.log('[translateImageViaEdge] error:', error.name, error.message)
    if (error.name === 'AbortError') {
      return { error_code: '-1', error_msg: '请求超时' }
    }
    return { error_code: '-1', error_msg: error.message || '网络请求失败' }
  }
}
