import { app } from 'electron'

interface UpdateInfo {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  publishedAt: string
}

const GITHUB_OWNER = 'ArcMichael'
const GITHUB_REPO = 'LiteTrans'

function compareVersions(v1: string, v2: string): number {
  const normalize = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [a, b] = [normalize(v1), normalize(v2)]
  for (let i = 0; i < 3; i++) {
    if ((a[i] || 0) > (b[i] || 0)) return 1
    if ((a[i] || 0) < (b[i] || 0)) return -1
  }
  return 0
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  const currentVersion = app.getVersion()
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'LiteTrans' } }
    )
    if (!response.ok) throw new Error('Failed to fetch release info')

    const data = await response.json()
    const latestVersion = (data.tag_name || '') as string
    const hasUpdate = compareVersions(latestVersion, currentVersion) > 0

    return {
      hasUpdate,
      currentVersion,
      latestVersion: latestVersion.replace(/^v/, ''),
      releaseUrl: data.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      releaseNotes: data.body || '',
      publishedAt: data.published_at || '',
    }
  } catch (err) {
    console.error('[checkForUpdates] error:', err)
    return {
      hasUpdate: false,
      currentVersion,
      latestVersion: currentVersion,
      releaseUrl: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases`,
      releaseNotes: '',
      publishedAt: '',
    }
  }
}
