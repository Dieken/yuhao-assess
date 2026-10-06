/**
 * yuhao-assess CLI 入口
 *
 * 用法：
 *   tsx src/cli/index.ts <碼表文件路徑> --scheme <方案配置文件路徑> [--format json|table]
 */

import { promises as fs } from 'node:fs'
import { extname } from 'node:path'
import { parseArgs, printHelp } from './arg-parser'
import { loadScheme, getCodeTableMeta } from './scheme-loader'
import { initAdapter } from './node-adapter'
import { 碼表處理服務實例 } from '../services/codeTableService'
import { runAllAnalyses } from './analyzer'
import { formatOutput } from './output-formatter'
import type { 方案配置介面 } from '../types/scheme'

// ─── 進度輸出（輸出到 stderr）────────────────────────────────────────────────

function timestamp(): string {
  const now = new Date()
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  return '[' + hh + ':' + mm + ':' + ss + ']'
}

function logProgress(step: string): void {
  process.stderr.write(timestamp() + ' 開始：' + step + '\n')
}

function logStepDone(step: string, ms: number): void {
  process.stderr.write(timestamp() + ' 完成：' + step + ' +' + ms + 'ms\n')
}

// ─── 支持的文件擴展名 ─────────────────────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set(['.txt', '.csv', '.tsv', '.yaml', '.yml'])

// ─── 主流程 ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const totalStart = Date.now()

  // 1. 解析參數（只校驗 --scheme 必填，碼表路徑延遲校驗）
  let args
  try {
    args = parseArgs(process.argv)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] ' + msg + '\n')
    process.stderr.write('運行 --help 查看使用説明\n')
    process.exit(1)
  }

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  // 2. 加載方案配置
  //    - 文件不存在時：生成模板並 exit(0)，無需碼表路徑
  //    - 文件存在時：繼續後續流程
  let scheme: 方案配置介面
  try {
    scheme = await loadScheme(args.schemePath)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] ' + msg + '\n')
    process.exit(1)
  }

  // 3. scheme 文件存在，現在才校驗碼表路徑
  if (!args.codeTablePath) {
    process.stderr.write(
      '[錯誤] 缺少必填參數：碼表文件路徑（位置參數）\n運行 --help 查看使用説明\n'
    )
    process.exit(1)
  }

  // 4. 驗證碼表文件擴展名
  const ext = extname(args.codeTablePath).toLowerCase()
  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    process.stderr.write(
      '[錯誤] 不支持的文件格式：' +
        ext +
        '\n支持的格式：' +
        Array.from(SUPPORTED_EXTENSIONS).join('、') +
        '\n'
    )
    process.exit(1)
  }

  // 5. 驗證碼表文件存在
  try {
    await fs.access(args.codeTablePath)
  } catch {
    process.stderr.write('[錯誤] 碼表文件不存在或不可讀：' + args.codeTablePath + '\n')
    process.exit(1)
  }

  // 6. 初始化 Node.js 適配層（注入 Jotai store）
  try {
    await initAdapter()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] 初始化失敗：' + msg + '\n')
    process.exit(1)
  }

  // 7. 讀取並解析碼表文件
  const meta = getCodeTableMeta(scheme)
  let codeTableText: string
  try {
    codeTableText = await fs.readFile(args.codeTablePath, 'utf-8')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] 讀取碼表文件失敗：' + msg + '\n')
    process.exit(1)
  }

  process.stderr.write(timestamp() + ' 解析碼表文件...\n')
  let parseResult
  try {
    parseResult = await 碼表處理服務實例.解析原始碼表文本(
      codeTableText,
      meta.分隔符,
      meta.第一列類型
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] 碼表解析失敗：' + msg + '\n')
    process.exit(1)
  }

  if (!parseResult.rawCodeTable || parseResult.rawCodeTable.size === 0) {
    process.stderr.write('[錯誤] 碼表解析後不包含任何有效字符-編碼對，請檢查文件格式和分隔符設置\n')
    process.exit(1)
  }

  // 8. 處理碼表（生成四張輔助碼表）
  let processedCodeTable
  try {
    processedCodeTable = await 碼表處理服務實例.處理原始碼表(parseResult.rawCodeTable, {
      最大碼長: scheme.方案參數.最大碼長,
      編碼終止指示符列表: scheme.方案參數.編碼終止指示符列表,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] 碼表處理失敗：' + msg + '\n')
    process.exit(1)
  }

  process.stderr.write(
    timestamp() + ' 碼表解析完成，共 ' + processedCodeTable.全碼表.size + ' 個字符\n'
  )

  // 9. 執行六項分析
  let analysisResult
  try {
    analysisResult = await runAllAnalyses({
      processedCodeTable,
      maxCodeLength: scheme.方案參數.最大碼長,
      onStepStart: logProgress,
      onStepDone: logStepDone,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write('[錯誤] 分析計算失敗：' + msg + '\n')
    process.exit(1)
  }

  const totalMs = Date.now() - totalStart
  process.stderr.write(timestamp() + ' 全部分析完成，總耗時 ' + totalMs + 'ms\n')

  // 10. 組裝輸出數據並寫入 stdout 或文件
  const output: 方案配置介面 = {
    ...scheme,
    測評結果: analysisResult,
  }
  const formatted = formatOutput(output, args.format)

  if (args.outputPath) {
    try {
      await fs.writeFile(args.outputPath, formatted + '\n', 'utf-8')
      process.stderr.write('[完成] 結果已寫入：' + args.outputPath + '\n')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      process.stderr.write('[錯誤] 寫入輸出文件失敗：' + msg + '\n')
      process.exit(1)
    }
  } else {
    process.stdout.write(formatted + '\n')
  }
}

// ─── 頂層錯誤處理 ─────────────────────────────────────────────────────────────

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write('[錯誤] ' + msg + '\n')
  process.exit(1)
})
