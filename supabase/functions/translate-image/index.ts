// @ts-ignore - Deno ESM imports
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// @ts-ignore
import md5 from 'https://esm.sh/md5@2.3.0'

declare const Deno: {
  env: { get(key: string): string | undefined }
}

const BAIDU_API_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('[translate-image] Request received:', req.method)
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 验证用户身份
    const authHeader = req.headers.get('Authorization')
    console.log('[translate-image] Auth header present:', !!authHeader)
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未授权' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('[translate-image] User:', user?.id, 'Error:', authError?.message)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: '用户验证失败' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 获取百度 API 凭证
    const appid = Deno.env.get('BAIDU_APPID')
    const secret = Deno.env.get('BAIDU_SECRET')
    if (!appid || !secret) {
      return new Response(JSON.stringify({ error: '服务配置错误' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 解析请求
    const formData = await req.formData()
    const imageFile = formData.get('image') as File
    const fromLang = formData.get('from') as string || 'auto'
    const toLang = formData.get('to') as string || 'zh'

    if (!imageFile) {
      return new Response(JSON.stringify({ error: '缺少图片' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 生成签名
    const imageBuffer = new Uint8Array(await imageFile.arrayBuffer())
    const salt = Date.now().toString()
    const cuid = 'APICUID'
    const mac = 'mac'

    const imageMd5 = md5(Array.from(imageBuffer))
    const signStr = appid + imageMd5 + salt + cuid + mac + secret
    const sign = md5(signStr)

    // 构建请求到百度 API
    const baiduForm = new FormData()
    baiduForm.append('image', new Blob([imageBuffer]), 'screenshot.png')
    baiduForm.append('from', fromLang)
    baiduForm.append('to', toLang)
    baiduForm.append('appid', appid)
    baiduForm.append('salt', salt)
    baiduForm.append('sign', sign)
    baiduForm.append('cuid', cuid)
    baiduForm.append('mac', mac)
    baiduForm.append('version', '3')
    baiduForm.append('paste', '1')

    console.log('[translate-image] Calling Baidu API...')
    const baiduResponse = await fetch(BAIDU_API_URL, {
      method: 'POST',
      body: baiduForm,
    })

    const result = await baiduResponse.json()
    console.log('[translate-image] Baidu response:', JSON.stringify(result).substring(0, 500))

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Translation error:', error)
    return new Response(JSON.stringify({ error: error.message || '翻译失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
