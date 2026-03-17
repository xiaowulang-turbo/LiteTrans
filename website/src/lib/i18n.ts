export type Locale = 'zh' | 'en'

export const translations = {
	zh: {
		// Navbar
		nav: {
			features: '功能',
			download: '下载',
		},
		// Hero
		hero: {
			badge: 'macOS / Windows 双平台支持',
			title: ['截图', '即', '翻译'],
			subtitle: '一键快捷键截图，AI 实时识别翻译，图文对照展示，让跨语言阅读更轻松',
			macDownload: 'macOS 下载',
			winDownload: 'Windows 下载',
			learnMore: '了解更多',
			versionInfo: '{version} · 免费使用 · 每日 20 次配额',
			demo: '产品演示',
		},
		// Features
		features: {
			title: ['简单三步，', '轻松翻译'],
			subtitle: '专为效率而生的截图翻译体验',
			items: [
				{
					icon: '⌨️',
					title: '快捷键截图',
					description: 'Alt+Q 一键唤起截图，选区即捕获，无需繁琐操作',
				},
				{
					icon: '🌐',
					title: 'AI 实时翻译',
					description: '云端 AI 识别图片文字，支持中英日韩多语言互译',
				},
				{
					icon: '📄',
					title: '图文对照',
					description: '翻译结果直接覆盖原图，保持排版，一目了然',
				},
			],
		},
		// Download
		download: {
			title: '立即体验 LiteTrans',
			description: '支持 macOS 12.0+ 及 Windows 10+，安装即用，无需配置',
			macDownload: 'macOS 下载',
			winDownload: 'Windows 下载',
			free: '免费使用',
			quota: '每日 20 次配额',
			noAds: '无广告',
		},
		// Footer
		footer: {
			privacy: '隐私政策',
			terms: '使用条款',
			copyright: '© {year} LiteTrans. All rights reserved.',
		},
	},
	en: {
		// Navbar
		nav: {
			features: 'Features',
			download: 'Download',
		},
		// Hero
		hero: {
			badge: 'macOS / Windows Support',
			title: ['Screenshot', 'to', 'Translate'],
			subtitle: 'One-key screenshot, AI real-time translation, side-by-side view for easier cross-language reading',
			macDownload: 'Download for macOS',
			winDownload: 'Download for Windows',
			learnMore: 'Learn More',
			versionInfo: '{version} · Free · 20 daily quota',
			demo: 'Product Demo',
		},
		// Features
		features: {
			title: ['Three Simple Steps,', 'Easy Translation'],
			subtitle: 'Screenshot translation experience built for efficiency',
			items: [
				{
					icon: '⌨️',
					title: 'Screenshot Shortcut',
					description: 'Alt+Q to capture, select area and snap - no complicated steps',
				},
				{
					icon: '🌐',
					title: 'AI Real-time Translation',
					description: 'Cloud AI recognizes text, supports Chinese, English, Japanese, Korean',
				},
				{
					icon: '📄',
					title: 'Side-by-Side View',
					description: 'Translation overlays original image, preserving layout for easy comparison',
				},
			],
		},
		// Download
		download: {
			title: 'Try LiteTrans Now',
			description: 'Supports macOS 12.0+ and Windows 10+, install and use, no configuration needed',
			macDownload: 'Download for macOS',
			winDownload: 'Download for Windows',
			free: 'Free to Use',
			quota: '20 Daily Quota',
			noAds: 'No Ads',
		},
		// Footer
		footer: {
			privacy: 'Privacy Policy',
			terms: 'Terms of Service',
			copyright: '© {year} LiteTrans. All rights reserved.',
		},
	},
}

export type Translations = (typeof translations)['zh'] | (typeof translations)['en']
