import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'

const CACHE_DIR_NAME = 'image_cache'

function getCacheDir(): string {
  const userDataPath = app.getPath('userData')
  const cachePath = path.join(userDataPath, CACHE_DIR_NAME)
  if (!fs.existsSync(cachePath)) {
    try {
      fs.mkdirSync(cachePath, { recursive: true })
    } catch (err) {
      console.error('[Cache] Failed to create cache dir:', err)
    }
  }
  return cachePath
}

// Convert Storage path (user_id/timestamp.png) to a safe filename (MD5 hash or just replace /)
// Using MD5 is safer for length and characters.
function getCacheKey(storagePath: string): string {
  return crypto.createHash('md5').update(storagePath).digest('hex') + '.png'
}

export function getCachedImage(storagePath: string): string | null {
  try {
    const filename = getCacheKey(storagePath)
    const filePath = path.join(getCacheDir(), filename)
    
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath)
      // Return as base64
      return data.toString('base64')
    }
  } catch (err) {
    console.error('[Cache] Error reading cache:', err)
  }
  return null
}

export async function saveImageToCache(url: string, storagePath: string): Promise<string | null> {
  try {
    const filename = getCacheKey(storagePath)
    const filePath = path.join(getCacheDir(), filename)
    
    // Check if already exists (race condition check)
    if (fs.existsSync(filePath)) {
      return getCachedImage(storagePath)
    }

    // Download image
    // Using Electron's net module or just fetch if available in Node environment (Node 18+)
    // Electron main process has Node environment.
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    fs.writeFileSync(filePath, buffer)
    console.log('[Cache] Saved image to:', filePath)
    
    return buffer.toString('base64')
  } catch (err) {
    console.error('[Cache] Error saving to cache:', err)
    return null
  }
}
