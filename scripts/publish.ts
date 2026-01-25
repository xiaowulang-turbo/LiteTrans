
import { execSync } from 'child_process'
import dotenv from 'dotenv'
import path from 'path'

// 加载 .env 文件
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

if (!process.env.GH_TOKEN) {
  console.error('❌ 错误: .env 文件中未找到 GH_TOKEN')
  process.exit(1)
}

console.log('🚀 开始构建并发布到 GitHub Releases...')

try {
  // 运行构建和发布命令
  // 注意：electron-builder 会自动读取 GH_TOKEN 环境变量
  execSync('npm run build && electron-builder --publish always', { 
    stdio: 'inherit', 
    env: { ...process.env } // 传递当前环境变量（包含 GH_TOKEN）
  })
  console.log('✅ 发布成功!')
} catch (error) {
  console.error('❌ 发布失败')
  process.exit(1)
}
