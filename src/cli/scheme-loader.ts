/**
 * 方案配置加載模塊
 *
 * 負責：
 * - 解析 JSONC 格式（JSON with Comments），使用 jsonc-parser 庫
 * - 加載並驗證方案配置文件
 * - 生成默認方案配置模板（JSONC 格式，含註釋）
 * - 提取碼表元數據（含默認值填充）
 */

import { promises as fs } from 'node:fs'
import { parse as jsoncParse, type ParseError } from 'jsonc-parser'
import type { 方案配置介面, 方案碼表元數據介面 } from '../types/scheme'

/**
 * 解析 JSONC 文本（JSON with Comments）
 * 使用 jsonc-parser 庫，支持 // 單行註釋、塊註釋及尾隨逗號。
 *
 * @param text - JSONC 格式的文本
 * @returns 解析後的 JavaScript 值
 * @throws 當文本包含解析錯誤時抛出包含錯誤詳情的 Error
 */
export function parseJsonc(text: string): unknown {
  const errors: ParseError[] = []
  const result = jsoncParse(text, errors, {
    allowTrailingComma: true,
    allowEmptyContent: false,
    disallowComments: false,
  })

  if (errors.length > 0) {
    const details = errors
      .map(e => `offset ${e.offset}, length ${e.length}, code ${e.error}`)
      .join('; ')
    throw new Error('JSONC 解析錯誤：' + details)
  }

  return result
}

/**
 * 生成默認方案配置模板（JSONC 格式，含詳細註釋）
 * 模板中創建時間和更新時間填入當前 ISO 8601 時間。
 *
 * @returns JSONC 格式的模板字符串
 */
export function generateSchemeTemplate(): string {
  const now = new Date().toISOString()
  const lines = [
    '{',
    '  // 方案元數據',
    '  "元數據": {',
    '    // 方案名稱，如「靈明」',
    '    "方案名": "",',
    '    // 唯一標識符（通常與文件名一致），如「yuling」',
    '    "標識符": "",',
    '    // 作者姓名（可選）',
    '    "作者": "",',
    '    // 版本號（語義版本），如「1.0.0」',
    '    "版本": "1.0.0",',
    '    // 官網 URL（可選）',
    '    "官網": "",',
    '    // 方案描述（可選）',
    '    "描述": "",',
    '    // 標籤列表，如 ["形碼", "前綴碼", "五碼"]（可選）',
    '    "標籤": [],',
    '    // 相關資源鏈接列表（教程、社群等）（可選）',
    '    "相關資源鏈接": [],',
    '    // 碼表下載鏈接（可選）',
    '    "碼表下載鏈接": "",',
    '    // 創建時間（ISO 8601 格式）',
    '    "創建時間": "' + now + '",',
    '    // 更新時間（ISO 8601 格式）',
    '    "更新時間": "' + now + '"',
    '  },',
    '  // 方案參數',
    '  "方案參數": {',
    '    // 最大編碼長度，如 4 或 5',
    '    "最大碼長": 4,',
    '    // 編碼終止指示符列表，如 ["a", "o", "e", "i", "u", "_"]（可選）',
    '    "編碼終止指示符列表": [],',
    '    // 選重鍵是否計入編碼長度（默認 false）',
    '    "選重編碼化": false,',
    '    // 是否「出簡不出全」（默認 false）',
    '    "出簡不出全": false',
    '  },',
    '  // 碼表元數據',
    '  "碼表元數據": {',
    '    // 碼表列分隔符，可選值：製表符、空格、逗號、分號',
    '    "分隔符": "製表符",',
    '    // 碼表第一列的含義，可選值：字符、編碼',
    '    "第一列類型": "字符"',
    '  }',
    '}',
    '',
  ]
  return lines.join('\n')
}

/**
 * 加載並驗證方案配置文件
 *
 * - 若文件不存在：自動生成模板文件，向 stderr 輸出提示，然後 process.exit(0)
 * - 若文件存在但内容無效：抛出錯誤
 * - 若必填字段缺失：抛出説明缺失字段的錯誤
 *
 * @param filePath - 方案配置文件路徑
 * @returns 解析並驗證後的方案配置對象
 */
export async function loadScheme(filePath: string): Promise<方案配置介面> {
  let text: string

  try {
    text = await fs.readFile(filePath, 'utf-8')
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      const template = generateSchemeTemplate()
      await fs.writeFile(filePath, template, 'utf-8')
      process.stderr.write(
        '[提示] 方案配置文件不存在，已在以下路徑生成模板文件，請填寫後重新運行：\n  ' +
          filePath +
          '\n'
      )
      process.exit(0)
    }
    throw err
  }

  // 解析 JSONC
  let parsed: unknown
  try {
    parsed = parseJsonc(text)
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err)
    throw new Error('方案配置文件解析失敗（' + filePath + '）：' + detail)
  }

  // 驗證頂層結構
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('方案配置文件格式錯誤（' + filePath + '）：頂層必須是 JSON 對象')
  }

  const obj = parsed as Record<string, unknown>

  // 驗證必填字段
  const missingFields: string[] = []
  if (typeof obj['元數據'] !== 'object' || obj['元數據'] === null) {
    missingFields.push('元數據')
  }
  if (typeof obj['方案參數'] !== 'object' || obj['方案參數'] === null) {
    missingFields.push('方案參數')
  }

  if (missingFields.length > 0) {
    throw new Error('方案配置文件缺少必填字段（' + filePath + '）：' + missingFields.join('、'))
  }

  return parsed as 方案配置介面
}

/**
 * 從方案配置中提取碼表元數據，並填充默認值
 *
 * 默認值：分隔符 = 製表符，第一列類型 = 字符
 *
 * @param scheme - 方案配置對象
 * @returns 填充了默認值的碼表元數據
 */
export function getCodeTableMeta(scheme: 方案配置介面): 方案碼表元數據介面 {
  const meta = scheme.碼表元數據
  return {
    分隔符: meta?.分隔符 ?? '製表符',
    第一列類型: meta?.第一列類型 ?? '字符',
    總字符數: meta?.總字符數,
    哈希值: meta?.哈希值,
  }
}

// ─── 工具函數 ────────────────────────────────────────────────────────────────

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && 'code' in err
}
