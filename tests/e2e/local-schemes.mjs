/**
 * 本地多方案的端到端檢查
 *
 * 為什麼要有這一支：本地方案這一路的毛病都是「編譯過、類型對、頁面也畫得出來，
 * 可是存進 localStorage 的東西是空的」。單元測試照不到，只有真點一遍才看得見。
 * 2026-10-06 就是這麼查出克隆存不下測評結果的。
 *
 * 用的是本機裝的 Chrome（`channel: 'chrome'`），不下載 playwright 自帶的瀏覽器。
 *
 *   pnpm test:e2e
 */

import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const 端口 = 4319
const 網址 = `http://localhost:${端口}/`

let 失敗 = 0
function 檢查(通過, 說的是, 附註 = '') {
  console.log(`${通過 ? '✅' : '❌'}  ${說的是}${附註 ? '   [' + 附註 + ']' : ''}`)
  if (!通過) 失敗 += 1
}

/** 等 vite preview 起來 */
async function 等服務(毫秒 = 30000) {
  const 截止 = Date.now() + 毫秒
  while (Date.now() < 截止) {
    try {
      if ((await fetch(網址)).ok) return true
    } catch {
      /* 還沒起來 */
    }
    await new Promise(r => setTimeout(r, 300))
  }
  return false
}

const 服務 = spawn('npx', ['vite', 'preview', '--port', String(端口), '--strictPort'], {
  stdio: 'ignore',
  detached: true,
})
process.on('exit', () => {
  try {
    process.kill(-服務.pid)
  } catch {
    /* 已經沒了 */
  }
})

if (!(await 等服務())) {
  console.error(`起不來 ${網址}——先 pnpm run build 再跑這一支`)
  process.exit(1)
}

const 瀏覽器 = await chromium.launch({ channel: 'chrome' })
const 頁 = await 瀏覽器.newPage({ viewport: { width: 1500, height: 950 } })
const 頁面報錯 = []
頁.on('pageerror', e => 頁面報錯.push(String(e)))

// antd v6 的類名與按鈕文字：選中值是 .ant-select-content-value，
// 而 CJK 按鈕文字中間會被插一個空格（「確 定」），所以一律用正則配。
const 標題 = () => 頁.locator('h1').first().innerText().then(s => s.trim())
const 可見選項 = () => 頁.locator('.ant-select-item-option:visible')
const 本地存檔 = () =>
  頁.evaluate(() => {
    const 列表 = JSON.parse(localStorage.getItem('yuhao-assess:local-schemes') || '[]')
    const 當前 = JSON.parse(localStorage.getItem('yuhao-assess:current-local-scheme-id') || 'null')
    return {
      列表: 列表.map(x => ({ 名: x.元數據.方案名, 結果數: Object.keys(x.測評結果 ?? {}).length })),
      當前,
      當前的結果: Object.keys(
        (列表.find(x => x.元數據.標識符 === 當前) ?? {}).測評結果 ?? {}
      ),
    }
  })

await 頁.goto(網址, { waitUntil: 'networkidle' })
await 頁.evaluate(() => localStorage.clear())
await 頁.reload({ waitUntil: 'networkidle' })
await 頁.waitForTimeout(1500)

檢查(
  (await 頁.locator('.ant-select:has(.ant-select-placeholder:text-is("切換本地方案"))').count()) === 0,
  '沒有本地方案時，本地方案下拉不畫出來'
)

// ── 挑一個內建方案 ───────────────────────────────────────────────────────────
await 頁.locator('.ant-select:has(.ant-select-placeholder:text-is("切換預設方案"))').first().click()
await 可見選項().first().waitFor()
const 方案名 = (await 可見選項().first().innerText()).trim()
await 可見選項().first().click()
await 頁.waitForTimeout(3500)
檢查((await 標題()) === 方案名, `頂欄切到內建方案「${方案名}」`)

// ── 克隆 ─────────────────────────────────────────────────────────────────────
await 頁.getByRole('button', { name: '克隆' }).click()
await 頁.waitForTimeout(2500)
檢查(
  / Copy on \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(await 標題()),
  '克隆後當前方案改名成「原名 Copy on yyyy-mm-dd HH:MM:SS」',
  await 標題()
)

const 存檔 = await 本地存檔()
檢查(存檔.列表.length === 2, '本地列表兩份：原方案快照 ＋ 克隆', JSON.stringify(存檔.列表))
// ⚠️ 這一條是 2026-10-06 那個 bug 的靶：當前方案身上沒有測評結果（載入時就被
//    拆進各個 atom 了），克隆若直接 {...當前方案} 就會存下一份空的。
檢查(
  存檔.當前的結果.length === 7,
  '克隆出來的那一份把七項測評結果都存進了 localStorage',
  存檔.當前的結果.join('、') || '空的'
)
檢查(
  存檔.當前的結果.includes('連續文本當量'),
  '連續文本當量也在裏面（收集結果的三處曾各寫各的，只有導出那一處帶了它）'
)
const 緊湊 = await 頁.evaluate(() => {
  const 列表 = JSON.parse(localStorage.getItem('yuhao-assess:local-schemes') || '[]')
  const 當前 = JSON.parse(localStorage.getItem('yuhao-assess:current-local-scheme-id') || 'null')
  const 統計 = 列表.find(x => x.元數據.標識符 === 當前)?.測評結果?.連續文本當量?.統計
  return 統計 ? Object.keys(Object.values(統計)[0]?.分佈 ?? {}) : []
})
檢查(
  緊湊.includes('起始') && 緊湊.includes('步長') && 緊湊.includes('個數'),
  '連續文本當量存的是緊湊格點，不是幾萬個原始樣本',
  緊湊.join(',')
)

// ── 切到原方案快照，再切回克隆：結果要回得來 ────────────────────────────────
const 本地下拉 = () => 頁.locator('.ant-select').nth(1)
await 本地下拉().click()
await 頁.waitForTimeout(700)
檢查((await 可見選項().count()) === 2, '本地下拉列出兩份')
await 可見選項().filter({ hasText: new RegExp('^' + 方案名 + '$') }).first().click()
await 頁.waitForTimeout(3000)
檢查((await 標題()) === 方案名, `切到本地方案「${方案名}」`)

await 頁.getByRole('menuitem', { name: '靜態重碼' }).click()
await 頁.waitForTimeout(2000)
檢查((await 頁.locator('.ant-table-tbody tr').count()) > 0, '切換後靜態重碼結果仍在')

await 頁.getByRole('menuitem', { name: '連續當量' }).click()
await 頁.waitForTimeout(2000)
await 本地下拉().click()
await 頁.waitForTimeout(700)
await 可見選項().filter({ hasText: /Copy on/ }).first().click()
await 頁.waitForTimeout(3000)
檢查((await 頁.locator('svg, canvas').count()) > 0, '切回克隆版後連續當量圖還畫得出來')

// ── 清除＝刪這一個本地方案 ───────────────────────────────────────────────────
await 頁.getByRole('menuitem', { name: '首頁' }).click()
await 頁.waitForTimeout(1000)
await 頁.getByRole('button', { name: '清除' }).click()
await 頁.waitForTimeout(600)
const 問句 = await 頁
  .locator('[class*="popover"], [class*="popconfirm"], [role="tooltip"]')
  .filter({ hasText: /確定/ })
  .first()
  .innerText()
檢查(/確定删除本地方案/.test(問句), '清除問的是「刪除本地方案」而非「清除所有數據」')
await 頁.getByRole('button', { name: /確\s*定/ }).first().click()
await 頁.waitForTimeout(2500)
檢查((await 標題()) === 方案名, '刪除後自動切到列表裏剩下的那一個')

// ── 對比頁 ───────────────────────────────────────────────────────────────────
await 頁.getByRole('menuitem', { name: '方案對比' }).click()
await 頁.waitForTimeout(2500)
await 頁.getByRole('button', { name: /選\s*擇\s*對\s*比\s*方\s*案/ }).first().click()
await 頁.waitForTimeout(1200)
const 彈窗 = await 頁
  .locator('.ant-modal, [role="dialog"]')
  .filter({ hasText: /選擇對比方案/ })
  .first()
  .innerText()
檢查(/本地方案/.test(彈窗) && /内置方案/.test(彈窗), '彈窗分「本地方案」與「内置方案」兩區')

檢查(頁面報錯.length === 0, '整趟沒有 page error', 頁面報錯.slice(0, 3).join(' | '))

await 瀏覽器.close()
console.log(失敗 === 0 ? '\n全部通過' : `\n${失敗} 項沒過`)
process.exit(失敗 === 0 ? 0 : 1)
