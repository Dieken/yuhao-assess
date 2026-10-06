# 本地多方案支持 — 需求規格

## 背景

當前應用只支持單一「當前方案」。用户需要能在瀏覽器本地保存多個方案配置及其測評結果，方便對比不同參數下的指標差異。

---

## 需求列表

### 1. 克隆方案

- 右上角新增「克隆」按鈕。
- 點擊後：
  1. 將**當前方案**（原方案名、原標識符、當前所有測評結果）作爲快照存入 local schemes。
  2. 將**當前方案**的方案名改爲「原名 + `Copy on yyyy-mm-dd HH:MM:SS`」，標識符改爲新生成的唯一 ID（`local-{timestamp}-{random}`）。
  3. `當前本地方案標識符` 指向新標識符。
  4. 跳轉到主頁，讓用户進一步修改配置。
- 結果：頁面顯示的是改了名字的新方案（克隆版），local schemes 裏保存的是原方案快照。

### 2. 本地方案切換器

- 右上角提供下拉框，列出所有本地方案（有本地方案時才顯示）。
- 切換時：恢復對應方案的測評結果到各 atoms，清空碼表相關狀態。

### 3. 清除行爲

- 當前方案是本地方案時，「清除」按鈕删除該本地方案：
  - 若列表還有其他方案，自動切換到列表末尾的方案。
  - 若列表爲空，清空所有數據。
- 當前方案不是本地方案時，「清除」行爲不變（清空所有數據）。
- 删除前彈出確認提示。

### 4. 測評結果自動同步

- 當 `當前本地方案標識符` 非空時，監聽各測評結果 atoms 的變化，自動將最新結果寫回 local schemes 對應條目（`useLocalSchemeSyncMetrics` hook，挂載在 `MainLayout`）。
- 重算指標後同樣自動同步，無需額外操作。

### 5. 方案對比集成

- 本地方案默認全部參與對比（新增方案時自動加入選中列表）。
- 「選擇對比方案」彈窗分「本地方案」和「内置方案」兩個區塊，可分别勾選/取消。
- 選中狀態持久化到 localStorage（`atomWithStorage`），切換頁面不丢失。
- 當前激活的本地方案已以「當前方案」形式出現在對比表格中，不重複添加。

### 6. 新建方案

- 新建時自動生成唯一標識符（`生成本地標識符()`，形如 `local-{timestamp}-{random}`），不使用硬編碼的 `new-scheme`。

### 7. 首頁預設方案下拉框

- 當前方案是本地方案時（標識符以 `local-` 開頭），下拉框顯示 placeholder，不干擾内置方案列表的選中狀態。

---

## 數據結構

直接複用現有的 `方案配置介面`（已含 `測評結果?: 方案測評結果介面`），不新增類型。

- **local schemes 存儲鍵**：`yuhao-assess:local-schemes`，值爲 `方案配置介面[]`
- **當前激活標識符**：`yuhao-assess:current-local-scheme-id`，值爲 `string | null`
- **對比頁選中本地方案**：`yuhao-assess:comparison-local-schemes`，值爲 `string[]`
- **唯一標識符格式**：`local-{Date.now()}-{Math.random().toString(36).slice(2,9)}`

---

## 實現文件清單

| 文件                                     | 改動類型                      |
| ---------------------------------------- | ----------------------------- |
| `src/atoms/localSchemes.ts`              | 新增                          |
| `src/hooks/useLocalSchemeSyncMetrics.ts` | 新增                          |
| `src/services/schemeService.ts`          | 修改（`創建空白方案` 標識符） |
| `src/components/layout/AppHeader.tsx`    | 修改（克隆、切換器、清除）    |
| `src/components/layout/MainLayout.tsx`   | 修改（挂載 hook）             |
| `src/pages/HomePage.tsx`                 | 修改（下拉框 value 邏輯）     |
| `src/pages/ComparisonPage.tsx`           | 修改（本地方案對比集成）      |
| `src/atoms/index.ts`                     | 修改（導出新 atoms）          |
