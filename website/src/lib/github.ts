const REPO_OWNER = 'xiaowulang-turbo'
const REPO_NAME = 'LiteTrans-Releases'

const FALLBACK: DownloadInfo = {
	version: 'v1.0.0',
	macUrl: 'https://github.com/xiaowulang-turbo/LiteTrans-Releases/releases/download/v1.0.0/LiteTrans-1.0.0-arm64.dmg',
	winUrl: 'https://github.com/xiaowulang-turbo/LiteTrans-Releases/releases/download/v1.0.0/LiteTrans.Setup.1.0.0.exe',
	publishedAt: '2026-02-01',
}

export interface DownloadInfo {
	version: string
	macUrl: string
	winUrl: string
	publishedAt: string
}

interface GitHubAsset {
	name: string
	browser_download_url: string
}

interface GitHubRelease {
	tag_name: string
	published_at: string
	assets: GitHubAsset[]
}

export async function getLatestRelease(): Promise<DownloadInfo> {
	try {
		const res = await fetch(
			`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
			{ next: { revalidate: 3600 } }
		)

		if (!res.ok) return FALLBACK

		const data: GitHubRelease = await res.json()

		const macAsset = data.assets.find((a) => a.name.endsWith('.dmg'))
		const winAsset = data.assets.find((a) => a.name.endsWith('.exe'))

		if (!macAsset || !winAsset) return FALLBACK

		return {
			version: data.tag_name,
			macUrl: macAsset.browser_download_url,
			winUrl: winAsset.browser_download_url,
			publishedAt: data.published_at.slice(0, 10),
		}
	} catch {
		return FALLBACK
	}
}
