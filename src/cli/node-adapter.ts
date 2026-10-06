/**
 * Node.js 適配層
 *
 * 在 Node.js 環境中替代瀏覽器 API：
 * - 用 fs.promises.readFile 替代 fetch
 * - 用進程内存 Map 替代 localStorage
 * - 初始化時將數據注入 Jotai 默認 store，使現有 charsetService 的同步函數可用
 */

import { promises as fs } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getDefaultStore } from 'jotai'
import { 字符集數據原子狀態, CJK區塊數據原子狀態 } from '../atoms/charset'
import type { 字符集數據型别, CJK區塊數據型别 } from '../atoms/charset'
import type { 頻率數據型别, 頻數數據型别, 當量表介面 } from '../types'

// ─── 路徑定位 ────────────────────────────────────────────────────────────────

// 使用 import.meta.url 定位到項目根目錄下的 public/ 目錄
// 本文件位於 src/cli/node-adapter.ts，向上兩級到項目根
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const PROJECT_ROOT = join(__dirname, '..', '..')

export function getPublicDataDir(): string {
  return join(PROJECT_ROOT, 'public', 'data')
}

export function getPublicSettingsDir(): string {
  return join(PROJECT_ROOT, 'public', 'settings')
}

// ─── 進程内存緩存（替代 localStorage）────────────────────────────────────────

const memoryCache = new Map<string, unknown>()

// ─── 文件讀取 ────────────────────────────────────────────────────────────────

/**
 * 讀取並解析 JSON 文件，帶進程内存緩存
 * 文件缺失時抛出含文件名和 pnpm run fetch 提示的錯誤
 */
export async function readJsonFile<T>(filePath: string): Promise<T> {
  const cached = memoryCache.get(filePath)
  if (cached !== undefined) {
    return cached as T
  }

  let text: string
  try {
    text = await fs.readFile(filePath, 'utf-8')
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      const fileName = filePath.split('/').pop() ?? filePath
      throw new Error('[錯誤] 數據文件缺失：' + fileName + '\n請運行 pnpm run fetch 下載數據文件')
    }
    throw err
  }

  const parsed = JSON.parse(text) as T
  memoryCache.set(filePath, parsed)
  return parsed
}

// ─── 字頻數據加載 ─────────────────────────────────────────────────────────────

const FREQ_FILE_MAP: Record<string, string> = {
  北語簡體字頻: 'charAbsoluteFrequencySC.json',
  臺標繁體字頻: 'charAbsoluteFrequencyTC.json',
  知乎簡體字頻: 'charAbsoluteFrequencyZhihu.json',
  古籍繁體字頻: 'charAbsoluteFrequencyGuji.json',
}

function normalizeFreq(raw: 頻數數據型别): 頻率數據型别 {
  const total = Object.values(raw).reduce((s, n) => s + n, 0)
  const result: 頻率數據型别 = {}
  for (const [char, count] of Object.entries(raw)) {
    result[char] = count / total
  }
  return result
}

/**
 * 加載指定類型的字頻數據（歸一化爲相對頻率）
 */
export async function loadCharFrequency(
  type: '北語簡體字頻' | '臺標繁體字頻' | '繁簡聯合字頻' | '知乎簡體字頻' | '古籍繁體字頻'
): Promise<頻率數據型别> {
  const cacheKey = 'freq:' + type
  const cached = memoryCache.get(cacheKey)
  if (cached !== undefined) {
    return cached as 頻率數據型别
  }

  if (type === '繁簡聯合字頻') {
    const [sc, tc] = await Promise.all([
      loadCharFrequency('北語簡體字頻'),
      loadCharFrequency('臺標繁體字頻'),
    ])
    const merged: 頻率數據型别 = { ...sc }
    for (const [char, freq] of Object.entries(tc)) {
      if (!merged[char] || merged[char]! < freq) {
        merged[char] = freq
      }
    }
    memoryCache.set(cacheKey, merged)
    return merged
  }

  const fileName = FREQ_FILE_MAP[type]
  if (!fileName) {
    throw new Error('未知字頻類型：' + type)
  }

  const filePath = join(getPublicDataDir(), fileName)
  const raw = await readJsonFile<頻數數據型别>(filePath)
  const normalized = normalizeFreq(raw)
  memoryCache.set(cacheKey, normalized)
  return normalized
}

// ─── 字符集數據加載 ───────────────────────────────────────────────────────────

/**
 * 加載字符集數據（charsets.json）
 */
export async function loadCharsetData(): Promise<字符集數據型别> {
  const filePath = join(getPublicDataDir(), 'charsets.json')
  return readJsonFile<字符集數據型别>(filePath)
}

/**
 * 加載 CJK 區塊數據（cjkBlocks.json）
 */
export async function loadCJKBlockData(): Promise<CJK區塊數據型别> {
  const filePath = join(getPublicSettingsDir(), 'cjkBlocks.json')
  return readJsonFile<CJK區塊數據型别>(filePath)
}

// ─── 當量表加載 ───────────────────────────────────────────────────────────────

/**
 * 加載速度當量表（equivTable.json）
 * 返回按鍵 -> 當量值的映射
 */
export async function loadEquivTable(): Promise<Record<string, number>> {
  const filePath = join(getPublicSettingsDir(), 'equivTable.json')
  const raw = await readJsonFile<當量表原始格式>(filePath)

  // equivTable.json 可能是 當量表介面 格式（含 data 字段）或直接是 Record<string, number>
  if (raw && typeof raw === 'object' && 'data' in raw && typeof raw.data === 'object') {
    return raw.data as Record<string, number>
  }
  return raw as unknown as Record<string, number>
}

// equivTable.json 的原始格式（可能含 data 字段）
type 當量表原始格式 = 當量表介面 | Record<string, number>

// ─── 適配層初始化 ─────────────────────────────────────────────────────────────

/**
 * 初始化 Node.js 適配層
 *
 * 將 CJK 區塊數據和字符集數據注入 Jotai 默認 store，
 * 使 charsetService.ts 中的同步字符集檢查函數（isInCJKToJ 等）可以正常工作。
 *
 * 必須在調用任何分析函數之前調用此函數。
 */
export async function initAdapter(): Promise<void> {
  const store = getDefaultStore()

  const [cjkData, charsetData] = await Promise.all([loadCJKBlockData(), loadCharsetData()])

  store.set(CJK區塊數據原子狀態, cjkData)
  store.set(字符集數據原子狀態, charsetData)
}

// ─── 工具函數 ────────────────────────────────────────────────────────────────

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err
}
