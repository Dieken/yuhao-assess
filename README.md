# 宇浩漢字輸入法測評系統

一個基於 React + TypeScript 的輸入法性能測評工具，支持重碼率、動態選重、速度當量、簡碼效率等多項指標分析。

## 📖 重要文檔

- **[命名規範 (NOMENCLATURE.md)](./docs/NOMENCLATURE.md)** - **必讀**，所有變量、類型、函數命名規範
- **[開發路線圖 (ROADMAP.md)](./docs/ROADMAP.md)** - 項目重構計劃與進度跟蹤

## ⚠️ 開發須知

**本倉庫採用繁體中文命名規範**：

- ✅ 所有變量、類型、函數名使用繁體中文
- ✅ 命名要求：具體、詳細、準確、自顯示
- ❌ 禁止使用縮寫、俗稱、别名
- 📋 詳見 [docs/NOMENCLATURE.md](./docs/NOMENCLATURE.md)

**示例**：

```typescript
// ✅ 正確
const 當前方案原子狀態 = atom<方案配置 | null>(null)
function 加載方案(方案鍵名: string): Promise<方案配置> { ... }

// ❌ 錯誤
const currentScheme = atom<SchemeConfig | null>(null)
function loadScheme(key: string): Promise<Config> { ... }
```

## 🚀 快速開始

```bash
pnpm install          # 安裝依賴
pnpm fetch            # 下載數據文件和内置方案（開發前先跑一次）
pnpm dev              # 開發模式
pnpm build            # 構建生産版本
pnpm format           # 代碼格式化
pnpm tc               # 字形轉換（台灣繁體 → 大陸通規繁體）
pnpm test:e2e         # 端到端檢查（用本機 Chrome，需先 pnpm build）
```

## 🖥 命令行測評（`pnpm cli`）

把網站那六項測評搬到命令行，跑的是**與網頁端同一批服務代碼**，不是另寫一份。

```bash
pnpm cli <碼表文件> --scheme <方案配置.jsonc> [--format json|table] [--output 文件]
```

方案檔不存在時會先生成一份帶註釋的模板然後退出，填好再跑：

```bash
pnpm cli ~/Downloads/某方案.txt --scheme ./某方案.jsonc
# → [提示] 方案配置文件不存在，已在以下路徑生成模板文件，請填寫後重新運行
```

模板裏要填的是方案名、標識符、**最大碼長**、**編碼終止指示符列表**、**選重鍵表**。
手上已有現成的方案 JSON 就直接拿它當 `--scheme`，不必走模板：

```bash
pnpm cli ../yuhao-assess-data/tables/tiger.txt \
         --scheme ../yuhao-assess-data/schemes/tiger.json --format table
```

- 碼表認 `.txt .csv .tsv .yaml .yml`；分隔符與首列類型讀方案裏的 `碼表元數據`。
- **進度印在 stderr，結果印在 stdout**，所以 `> 結果.json` 不會混進進度行；也可以用 `--output`。
- `--format table` 是扁平的「路徑 ⇥ 值」，好 grep；默認 `json` 是完整結構。
- 要先有數據：`pnpm fetch` 把字頻表、當量表、字集表拉到 `public/`。
- 它**不算連續文本當量**（那是網頁端專有的，由 `pnpm recompute` 補）。
- 簡碼效率的 N 值網格默認是 CLI 自己那一組（到五萬）；要與網站存檔對齊得用
  `簡碼效率N值列表`，`pnpm recompute` 已經這麽做了。

## 📦 項目結構

```text
yuhao-assess/
├── docs/                  # 文檔
│   ├── NOMENCLATURE.md    # 命名規範（必讀）
│   └── ROADMAP.md         # 開發路線圖
├── public/
│   ├── data/              # 大型數據文件（從 yuhao-assess-data CDN 加載）
│   ├── schemes/           # 内置方案測評結果（從 yuhao-assess-data CDN 加載）
│   └── settings/          # 配置文件（Git 追蹤）
├── src/
│   ├── atoms/             # Jotai 狀態管理
│   ├── components/        # React 組件
│   ├── services/          # 業務邏輯服務
│   ├── types/             # TypeScript 類型定義
│   └── utils/             # 工具函數
└── tests/                 # 測試文件
```

## 🔧 技術棧

- **框架**: React 19 + TypeScript 5
- **狀態管理**: Jotai
- **UI 庫**: Ant Design 6
- **構建工具**: Vite 5
- **代碼規範**: ESLint + Prettier
- **Git Hooks**: Husky + lint-staged
- **字形轉換**: normalize-traditional-chars (GujiCC)

## 📝 開發規範

1. **提交前自動處理** (pre-commit)：
   - 字形轉換（台灣繁體 → 大陸通規繁體）
   - ESLint 修復
   - Prettier 格式化
   - Markdownlint 檢查

2. **命名規範**：
   - 嚴格遵循 [NOMENCLATURE.md](./docs/NOMENCLATURE.md)
   - 使用標準名稱，禁止别名
   - 變量名要自顯示，減少註釋需求

3. **代碼組織**：
   - 類型定義放在 `src/types/`
   - 業務邏輯放在 `src/services/`
   - UI 組件放在 `src/components/`
   - 全局狀態放在 `src/atoms/`

## 📄 License

MIT
