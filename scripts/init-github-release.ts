
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const token = process.env.GH_TOKEN || process.argv[2]
if (!token) {
  console.error('❌ 错误: 未找到 GH_TOKEN。请在 .env 文件中配置 GH_TOKEN 或作为参数传入。')
  process.exit(1)
}

const REPO_NAME = 'LiteTrans-Releases'
const DESCRIPTION = 'Release repository for LiteTrans installer packages'

async function createRepo() {
  console.log(`🚀 正在创建/检查公开仓库: ${REPO_NAME}...`)
  
  try {
    const response = await axios.post(
      'https://api.github.com/user/repos',
      {
        name: REPO_NAME,
        description: DESCRIPTION,
        private: false, // 公开仓库
        auto_init: true
      },
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    )
    console.log('✅ 仓库创建成功!')
    console.log(`🔗 地址: ${response.data.html_url}`)
  } catch (error: any) {
    if (error.response?.status === 422) {
      console.log('⚠️ 仓库已存在，跳过创建。')
      
      // 验证是否为公开仓库
      try {
        const user = await axios.get('https://api.github.com/user', {
          headers: { 'Authorization': `token ${token}` }
        })
        const username = user.data.login
        
        const repo = await axios.get(`https://api.github.com/repos/${username}/${REPO_NAME}`, {
          headers: { 'Authorization': `token ${token}` }
        })
        
        if (repo.data.private) {
          console.warn('⚠️ 警告: 现有仓库是私有的。发布后的文件可能无法被公开下载。')
        } else {
          console.log('✅ 仓库检查通过: 已存在且为公开仓库。')
        }
      } catch (e) {
        console.error('❌ 无法检查现有仓库状态')
      }
    } else {
      console.error('❌ 创建失败:', error.response?.data?.message || error.message)
      process.exit(1)
    }
  }
}

createRepo()
