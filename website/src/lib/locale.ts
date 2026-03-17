import { headers } from 'next/headers'
import { Locale, translations } from './i18n'

export function getLocale(): Locale {
	const headersList = headers()
	const acceptLanguage = headersList.get('accept-language') || ''
	
	// 解析 Accept-Language 头，判断首选语言
	const languages = acceptLanguage.split(',').map(lang => {
		const [code] = lang.trim().split(';')
		return code?.toLowerCase() || ''
	})
	
	// 检查是否包含中文
	const isChinese = languages.some(lang => lang.startsWith('zh'))
	
	return isChinese ? 'zh' : 'en'
}

export function getTranslations(locale: Locale) {
	return translations[locale]
}
