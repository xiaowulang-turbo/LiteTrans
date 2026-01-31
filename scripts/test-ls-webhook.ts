import axios from 'axios'
import crypto from 'crypto'
// @ts-ignore
import dotenv from 'dotenv'

dotenv.config()

const WEBHOOK_SECRET =
	process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'your_webhook_secret'
// 默认为本地 Supabase Edge Function 地址
const TARGET_URL =
	process.env.TARGET_URL ||
	'https://vswoqqtiavuuxnicapxg.supabase.co/functions/v1/ls-webhook'

// 模拟的用户 ID (必须存在于你的 user_profiles 表中)
const USER_ID = process.argv[2] || '8c23f76f-0250-4484-9658-b31d0856ed20'
// 模拟的 Variant ID (必须存在于你的 plan_configs 表中)
const VARIANT_ID = process.argv[3] || '1265662'

if (!USER_ID) {
	console.error('❌ 请提供 User ID 作为参数')
	console.log(
		'示例: npx ts-node scripts/test-ls-webhook.ts <user_id> [variant_id]'
	)
	process.exit(1)
}

// 模拟 Lemon Squeezy Payload (Subscription Created)
const payload = {
	meta: {
		event_name: 'subscription_created',
		custom_data: {
			user_id: USER_ID,
		},
	},
	data: {
		type: 'subscriptions',
		id: 'sub_test_123',
		attributes: {
			store_id: 12345,
			customer_id: 54321,
			order_id: 98765,
			order_item_id: 11111,
			product_id: 22222,
			variant_id: parseInt(VARIANT_ID), // ⚠️ 确保这个 ID 在你的 plan_configs 表中有对应
			product_name: 'LiteTrans Pro (Test)',
			variant_name: 'Monthly',
			user_name: 'Test User',
			user_email: 'test@example.com',
			status: 'active',
			status_formatted: 'Active',
			card_brand: 'visa',
			card_last_four: '4242',
			pause: null,
			cancelled: false,
			trial_ends_at: null,
			billing_anchor: 123,
			urls: {
				update_payment_method: 'https://...',
			},
			renews_at: new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000
			).toISOString(),
			ends_at: null,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			test_mode: true,
		},
	},
}

// 生成签名
const rawBody = JSON.stringify(payload)
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
const digest = hmac.update(rawBody).digest('hex')

console.log('🚀 发送模拟 Webhook 请求...')
console.log('Target:', TARGET_URL)
console.log('User ID:', USER_ID)

async function sendWebhook() {
	try {
		const response = await axios.post(TARGET_URL, payload, {
			headers: {
				'Content-Type': 'application/json',
				'X-Signature': digest,
			},
		})

		console.log('\n✅ 请求成功!')
		console.log('Status:', response.status)
		console.log('Response:', response.data)
	} catch (err: any) {
		console.error('\n❌ 请求失败')
		console.error('Full Error:', err)
		if (err.response) {
			console.error('Status:', err.response.status)
			console.error('Data:', err.response.data)
		} else {
			console.error('Error:', err.message)
		}
	}
}

sendWebhook()
