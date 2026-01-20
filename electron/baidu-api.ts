import crypto from 'crypto'
import FormData from 'form-data'
import axios from 'axios'

const API_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture'

export interface BaiduConfig {
  appid: string
  secret: string
}

export interface TranslateOptions {
  from?: string
  to?: string
  paste?: 0 | 1 | 2
}

export interface TranslateResult {
  error_code: string
  error_msg: string
  data?: {
    from: string
    to: string
    sumSrc: string
    sumDst: string
    pasteImg?: string
    content?: Array<{
      src: string
      dst: string
      rect: string
    }>
  }
}

function md5(data: Buffer | string): string {
  return crypto.createHash('md5').update(data).digest('hex')
}

function generateSign(
  appid: string,
  imageBuffer: Buffer,
  salt: string,
  cuid: string,
  mac: string,
  secret: string
): string {
  const imageMd5 = md5(imageBuffer)
  const signStr = appid + imageMd5 + salt + cuid + mac + secret
  return md5(signStr)
}

export async function translateImage(
  imageBuffer: Buffer,
  config: BaiduConfig,
  options: TranslateOptions = {}
): Promise<TranslateResult> {
  const { appid, secret } = config
  const { from = 'auto', to = 'zh', paste = 1 } = options

  const salt = Date.now().toString()
  const cuid = 'APICUID'
  const mac = 'mac'

  const sign = generateSign(appid, imageBuffer, salt, cuid, mac, secret)

  const form = new FormData()
  form.append('image', imageBuffer, {
    filename: 'screenshot.png',
    contentType: 'image/png',
  })
  form.append('from', from)
  form.append('to', to)
  form.append('appid', appid)
  form.append('salt', salt)
  form.append('sign', sign)
  form.append('cuid', cuid)
  form.append('mac', mac)
  form.append('version', '3')
  form.append('paste', paste.toString())

  const response = await axios.post<TranslateResult>(API_URL, form, {
    headers: form.getHeaders(),
    timeout: 30000,
  })

  return response.data
}
