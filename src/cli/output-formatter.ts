/**
 * 輸出格式化模塊
 * 負責將分析結果格式化爲 JSON 或 table 格式輸出
 */

/**
 * 遞歸對對象鍵名按 Unicode 碼點字母序排序。
 * 數組元素順序不變，但數組内每個對象的鍵名會被排序。
 */
export function sortObjectKeys<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item)) as unknown as T
  }
  if (obj !== null && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {}
    const keys = Object.keys(obj as Record<string, unknown>).sort((a, b) =>
      a < b ? -1 : a > b ? 1 : 0
    )
    for (const key of keys) {
      sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key])
    }
    return sorted as unknown as T
  }
  return obj
}

/**
 * 格式化單個值爲 table 格式的字符串：
 * - string：輸出原始字符串（不加引號）
 * - number/boolean：輸出 JSON 字符串表示
 * - null：輸出字面量 "null"
 * - 數組：輸出單行 JSON，逗號後加一個空格（如 `["a", "b", "c"]`）
 */
export function formatTableValue(value: unknown): string {
  if (value === null) {
    return 'null'
  }
  if (typeof value === 'string') {
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    // 輸出單行 JSON，逗號後加一個空格
    return JSON.stringify(value).replace(/,(?=\S)/g, ', ')
  }
  // 兜底：其他類型用 JSON.stringify
  return JSON.stringify(value)
}

/**
 * 將嵌套對象展開爲 [path, value] 對列表。
 * 數組作爲原子值處理（不遞歸展開數組内容）。
 * 對象遞歸展開，路徑用 "." 連接。
 */
export function flattenToTable(obj: unknown, prefix?: string): Array<[string, string]> {
  const rows: Array<[string, string]> = []

  if (Array.isArray(obj)) {
    // 數組作爲原子值處理
    const path = prefix ?? ''
    rows.push([path, formatTableValue(obj)])
    return rows
  }

  if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix !== undefined && prefix !== '' ? `${prefix}.${key}` : key
      if (Array.isArray(value)) {
        // 數組作爲原子值
        rows.push([path, formatTableValue(value)])
      } else if (value !== null && typeof value === 'object') {
        // 遞歸展開嵌套對象
        rows.push(...flattenToTable(value, path))
      } else {
        // 標量葉節點
        rows.push([path, formatTableValue(value)])
      }
    }
    return rows
  }

  // 頂層爲標量（不常見，但處理一下）
  const path = prefix ?? ''
  rows.push([path, formatTableValue(obj)])
  return rows
}

/**
 * 生成最終輸出字符串。
 * - JSON 格式：先 sortObjectKeys，再用 2 空格縮進 JSON.stringify
 * - table 格式：先 sortObjectKeys，再 flattenToTable，按路徑字母序排序，
 *   輸出 `<path>\t<value>` 行（換行符連接）
 */
export function formatOutput(result: unknown, format: 'json' | 'table'): string {
  const sorted = sortObjectKeys(result)

  if (format === 'json') {
    return JSON.stringify(sorted, null, 2)
  }

  // table 格式
  const rows = flattenToTable(sorted)
  rows.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  return rows.map(([path, value]) => `${path}\t${value}`).join('\n')
}
