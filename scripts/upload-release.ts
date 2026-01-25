import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// 加载环境变量
dotenv.config()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
	console.error(
		'❌ 错误: 请在 .env 文件中配置 VITE_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY'
	)
	process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
	},
})

const BUCKET_NAME = 'releases'
const RELEASE_DIR = path.resolve(process.cwd(), 'release')

// 获取当前版本号
const packageJson = JSON.parse(
	fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8')
)
const VERSION = packageJson.version

async function uploadRelease() {
	console.log(`🚀 开始上传 v${VERSION} 版本构建产物...`)

	if (!fs.existsSync(RELEASE_DIR)) {
		console.error(`❌ 错误: release 目录不存在: ${RELEASE_DIR}`)
		console.error('请先运行 npm run electron:build 进行构建')
		process.exit(1)
	}

	// 检查 bucket 是否存在，不存在则创建
	const { data: buckets, error: listError } =
		await supabase.storage.listBuckets()
	if (listError) {
		console.error('❌ 获取 Bucket 列表失败:', listError.message)
		process.exit(1)
	}

	const bucketExists = buckets.find((b) => b.name === BUCKET_NAME)
	if (!bucketExists) {
		console.log(`📦 Bucket '${BUCKET_NAME}' 不存在，正在创建...`)
		const { error: createError } = await supabase.storage.createBucket(
			BUCKET_NAME,
			{
				public: true,
			}
		)
		if (createError) {
			console.error('❌ 创建 Bucket 失败:', createError.message)
			process.exit(1)
		}
		console.log(`✅ Bucket '${BUCKET_NAME}' 创建成功`)
	}

	// 尝试更新 Bucket 配置以允许大文件
	const { error: updateError } = await supabase.storage.updateBucket(
		BUCKET_NAME,
		{
			public: true,
			fileSizeLimit: 1073741824, // 1GB
			allowedMimeTypes: null, // 允许所有类型
		}
	)

	if (updateError) {
		console.warn('⚠️ 更新 Bucket 配置失败:', updateError.message)
		console.warn(
			'请手动在 Supabase Dashboard 中将 releases bucket 的上传限制设置为 1GB'
		)
	} else {
		console.log('✅ Bucket 配置更新成功 (限制 1GB)')
	}

	// 获取文件列表
	const files = fs.readdirSync(RELEASE_DIR)
	const uploadFiles = files.filter((file) => {
		return (
			file.endsWith('.dmg') ||
			file.endsWith('.exe') ||
			file.endsWith('.zip') ||
			(file.endsWith('.yml') && !file.startsWith('builder-debug'))
		)
	})

	if (uploadFiles.length === 0) {
		console.warn('⚠️ 未找到可上传的发布文件 (.dmg, .exe, .zip, .yml)')
		return
	}

	console.log(`📋 找到 ${uploadFiles.length} 个文件待上传:`)
	uploadFiles.forEach((f) => console.log(`  - ${f}`))

	for (const file of uploadFiles) {
		const filePath = path.join(RELEASE_DIR, file)
		const fileBuffer = fs.readFileSync(filePath)
		const remotePath = `v${VERSION}/${file}`

		console.log(`\n⬆️ 正在上传: ${file} -> ${remotePath}`)

		const { error } = await supabase.storage
			.from(BUCKET_NAME)
			.upload(remotePath, fileBuffer, {
				upsert: true,
				contentType: getContentType(file),
			})

		if (error) {
			console.error(`❌ 上传失败 ${file}:`, error.message)
		} else {
			const {
				data: { publicUrl },
			} = supabase.storage.from(BUCKET_NAME).getPublicUrl(remotePath)
			console.log(`✅ 上传成功! 下载链接:`)
			console.log(`   ${publicUrl}`)
		}
	}
}

function getContentType(filename: string): string {
	if (filename.endsWith('.dmg')) return 'application/x-apple-diskimage'
	if (filename.endsWith('.exe'))
		return 'application/vnd.microsoft.portable-executable'
	if (filename.endsWith('.zip')) return 'application/zip'
	if (filename.endsWith('.yml')) return 'text/yaml'
	return 'application/octet-stream'
}

uploadRelease().catch((err) => {
	console.error('❌ 未知错误:', err)
	process.exit(1)
})
