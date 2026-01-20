/**
 * 百度图片翻译 API 验证脚本
 * 用法: npx ts-node scripts/test-api.ts <图片路径>
 */
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import FormData from 'form-data'
import axios from 'axios'

const API_URL = 'https://fanyi-api.baidu.com/api/trans/sdk/picture'

// TODO: 填入你的百度翻译 API 凭证
const CONFIG = {
  appid: '20260118002542265',
  secret: '_8kyQel3L_HRlNYGMDdq',
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
  console.log('签名字符串:', `${appid} + ${imageMd5} + ${salt} + ${cuid} + ${mac} + [secret]`)
  return md5(signStr)
}

async function testTranslate(imagePath: string) {
  if (!fs.existsSync(imagePath)) {
    console.error('❌ 图片文件不存在:', imagePath)
    process.exit(1)
  }

  if (CONFIG.appid === 'YOUR_APPID') {
    console.error('❌ 请先在 scripts/test-api.ts 中填入百度 API 凭证')
    process.exit(1)
  }

  console.log('📷 读取图片:', imagePath)
  const imageBuffer = fs.readFileSync(imagePath)
  console.log('📦 图片大小:', (imageBuffer.length / 1024).toFixed(2), 'KB')

  const salt = Date.now().toString()
  const cuid = 'APICUID'
  const mac = 'mac'

  const sign = generateSign(CONFIG.appid, imageBuffer, salt, cuid, mac, CONFIG.secret)
  console.log('🔐 生成签名:', sign)

  const form = new FormData()
  form.append('image', imageBuffer, {
    filename: path.basename(imagePath),
    contentType: 'image/png',
  })
  form.append('from', 'auto')
  form.append('to', 'zh')
  form.append('appid', CONFIG.appid)
  form.append('salt', salt)
  form.append('sign', sign)
  form.append('cuid', cuid)
  form.append('mac', mac)
  form.append('version', '3')
  form.append('paste', '1')

  console.log('🚀 发送请求...')
  try {
    const response = await axios.post(API_URL, form, {
      headers: form.getHeaders(),
      timeout: 30000,
    })

    const result = response.data
    console.log('\n📋 API 响应:')
    console.log('  error_code:', result.error_code)
    console.log('  error_msg:', result.error_msg)

    if (result.error_code === '0' && result.data) {
      console.log('  from:', result.data.from)
      console.log('  to:', result.data.to)
      console.log('  sumSrc:', result.data.sumSrc)
      console.log('  sumDst:', result.data.sumDst)
      console.log('  pasteImg:', result.data.pasteImg ? `[Base64 ${result.data.pasteImg.length} chars]` : 'null')

      if (result.data.pasteImg) {
        const outputPath = imagePath.replace(/\.[^.]+$/, '_translated.png')
        fs.writeFileSync(outputPath, Buffer.from(result.data.pasteImg, 'base64'))
        console.log('\n✅ 翻译成功! 结果已保存:', outputPath)
      }
    } else {
      console.log('\n❌ 翻译失败:', result.error_msg)
    }
  } catch (err: unknown) {
    const error = err as Error & { response?: { data: unknown } }
    console.error('\n❌ 请求失败:', error.message)
    if (error.response) {
      console.error('响应数据:', error.response.data)
    }
  }
}

const imagePath = process.argv[2]
if (!imagePath) {
  console.log('用法: npx ts-node scripts/test-api.ts <图片路径>')
  console.log('示例: npx ts-node scripts/test-api.ts ./test.png')
  process.exit(1)
}

testTranslate(path.resolve(imagePath))
