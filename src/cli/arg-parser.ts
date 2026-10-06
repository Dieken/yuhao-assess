/**
 * CLI 參數解析模塊
 * 使用純 Node.js 實現，不依賴任何第三方庫
 */

export interface CliArgs {
  /** 位置參數：碼表文件路徑（必填） */
  codeTablePath: string
  /** --scheme <path>：方案配置文件路徑（必填） */
  schemePath: string
  /** --format <json|table>：輸出格式（默認 'json'） */
  format: 'json' | 'table'
  /** --output <path>：輸出文件路徑（可選，默認輸出到 stdout） */
  outputPath: string | null
  /** --help：顯示幫助信息 */
  help: boolean
}

/**
 * 解析命令行參數
 *
 * @param argv - process.argv 數組（通常從第 2 個元素開始爲用戶參數）
 * @returns 解析後的 CliArgs 對象
 * @throws 當必填參數缺失或參數值無效時抛出錯誤
 */
export function parseArgs(argv: string[]): CliArgs {
  // argv[0] 是 node/tsx 可執行文件路徑，argv[1] 是腳本路徑
  // 用戶參數從 argv[2] 開始
  const args = argv.slice(2)

  let codeTablePath = ''
  let schemePath = ''
  let format: 'json' | 'table' = 'json'
  let outputPath: string | null = null
  let help = false

  let i = 0
  while (i < args.length) {
    const arg = args[i]
    if (arg === undefined) {
      i++
      continue
    }

    if (arg === '--help' || arg === '-h') {
      help = true
      i++
    } else if (arg === '--scheme') {
      const next = args[i + 1]
      if (i + 1 >= args.length || !next || next.startsWith('-')) {
        throw new Error('--scheme 選項需要一個路徑參數')
      }
      schemePath = next
      i += 2
    } else if (arg.startsWith('--scheme=')) {
      schemePath = arg.slice('--scheme='.length)
      if (!schemePath) {
        throw new Error('--scheme 選項需要一個路徑參數')
      }
      i++
    } else if (arg === '--format') {
      const next = args[i + 1]
      if (i + 1 >= args.length || !next || next.startsWith('-')) {
        throw new Error('--format 選項需要一個值（json 或 table）')
      }
      if (next !== 'json' && next !== 'table') {
        throw new Error('--format 的值無效：' + next + '，有效值爲：json、table')
      }
      format = next
      i += 2
    } else if (arg.startsWith('--format=')) {
      const val = arg.slice('--format='.length)
      if (val !== 'json' && val !== 'table') {
        throw new Error('--format 的值無效：' + val + '，有效值爲：json、table')
      }
      format = val
      i++
    } else if (arg === '--output') {
      const next = args[i + 1]
      if (i + 1 >= args.length || !next || next.startsWith('-')) {
        throw new Error('--output 選項需要一個文件路徑參數')
      }
      outputPath = next
      i += 2
    } else if (arg.startsWith('--output=')) {
      outputPath = arg.slice('--output='.length)
      if (!outputPath) {
        throw new Error('--output 選項需要一個文件路徑參數')
      }
      i++
    } else if (arg.startsWith('-')) {
      throw new Error('未知選項：' + arg)
    } else {
      // 位置參數
      if (codeTablePath) {
        throw new Error('意外的位置參數：' + arg)
      }
      codeTablePath = arg
      i++
    }
  }

  // 如果是 --help，不校驗必填參數
  if (help) {
    return { codeTablePath, schemePath, format, outputPath, help }
  }

  // 只校驗 --scheme（碼表路徑在 index.ts 中延遲校驗，因爲 scheme 不存在時會生成模板並退出）
  if (!schemePath) {
    throw new Error('缺少必填選項：--scheme <path>')
  }

  return { codeTablePath, schemePath, format, outputPath, help }
}

/**
 * 輸出幫助信息到 stdout
 */
export function printHelp(): void {
  const helpText = `用法：tsx src/cli/index.ts <碼表文件路徑> --scheme <方案配置文件路徑> [選項]

參數：
  <碼表文件路徑>              碼表文件路徑（必填），支持 .txt、.csv、.tsv、.yaml、.yml 格式

選項：
  --scheme <path>            方案配置文件路徑（必填），JSONC 格式
                             若文件不存在，將自動生成帶註釋的模板文件
  --format <json|table>      輸出格式（默認：json）
                               json   — 格式化 JSON，2 空格縮進，鍵名按 Unicode 碼點排序
                               table  — 扁平化鍵值對，製表符分隔，按路徑字母序排序
  --output <path>            輸出文件路徑（可選，默認輸出到 stdout）
  --help, -h                 顯示此幫助信息並退出

示例：
  tsx src/cli/index.ts ./rime-ice.dict.yaml --scheme ./my-scheme.jsonc
  tsx src/cli/index.ts ./table.txt --scheme ./scheme.jsonc --format table
  tsx src/cli/index.ts ./table.txt --scheme ./scheme.jsonc --output ./result.json
`
  process.stdout.write(helpText)
}
