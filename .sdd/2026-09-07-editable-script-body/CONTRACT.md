# Contract Traceability Matrix — 算式內容放寬到整個檔案主體

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/models/domains/indicator-script-domain.ts`, `app/domain/models/dto/`, `app/domain/models/domains/strategy-draft-domain.ts`, `app/domain/service/`, `app/application/`, `app/components/molecules/IndicatorScriptEditor.vue`, `app/components/organisms/IndicatorCalculationPanel.vue`
Oracle: Acceptance Criteria (12 scenarios + 7 business rules)
Verification: **static conformance audit** — judges test assertions and code paths
against the spec's expected outcome; does not execute invented scenarios.

## Clauses

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01a | US-01 唯讀區不含進入點 | 唯讀外框 = `package main` + `import ( "indicator" "math" "sort" )`；不含 `func Calculate` 那一行 | `indicator-script-domain.ts:56-64,89-91` (`FRAME_HEADER` / `frameHeader()`) | `indicator-script-domain.spec.ts` "唯讀外框就是那七行，不含進入點" + `IndicatorScriptEditor.spec.ts` "唯讀外框只到 import，進入點與收尾都在可編輯區" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01b | US-01 唯讀區不隨指標值種類變 | 改種類 → 唯讀外框一字不變 | `frameHeader()` 回傳常數 `FRAME_HEADER` | `indicator-script-domain.spec.ts` "唯讀外框不隨指標值種類變" (`it.each` 五種) + `IndicatorCalculationPanel.spec.ts` "唯讀外框固定是那七行，不隨種類變" + `IndicatorScriptEditor.spec.ts` "外框不隨樣板換掉" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-01c | US-01 可編輯區可放進入點以外的函式 | 送出的算式 = 唯讀區 + 使用者寫的整段（含 helper） | `indicator-script-domain.ts:141-143` (`assemble` 原樣接主體) + 後端 `interp.Eval(script)` 允許頂層多宣告 | `indicator-script-domain.spec.ts` "主體是頂層 Go，原樣接上——helper 函式也一起送出去" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02a | US-02 信號種類的空白 stub | 可編輯區 = `func Calculate(data []indicator.KCandle) indicator.Signal {` + 一行空縮排 + `}` | `indicator-script-domain.ts:108-110` (`blankBody()`) | `indicator-script-domain.spec.ts` "空白 stub 是一個空的 Calculate…" (`it.each` signal 列) + template DTO 測試 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02b | US-02 一串數字種類的空白 stub / 第一次進畫面 | 可編輯區是回傳 `map[string][]float64` 的空 Calculate stub | `blankBody()` + `IndicatorCalculationPanel.vue:87-92` (`blankStrategyContent.scriptBody = describeIndicatorScript(default).blankBody`) | `indicator-script-domain.spec.ts` (`it.each` floatList 列) + `IndicatorCalculationPanel.spec.ts` "第一次進畫面時，可編輯區已經有一個空的 Calculate stub" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02c | US-02 未改動的 stub 不算未儲存的變更 | 還沒載入過策略 + 可編輯區是未改動的 stub → 沒有未儲存的變更 | `strategy-draft-domain.ts:31-49` (`isUntouchedDraft()` 比對 `blankBody()`) | `strategy-draft-domain.spec.ts` "還是 $resultType 未改動的空白 stub 時不必問" (`it.each` float/floatList) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02d | US-02 清成空白也不算未儲存的變更 | 可編輯區被清成完全空白 → 沒有未儲存的變更 | `strategy-draft-domain.ts` (`isUntouchedDraft` 的 `trimmedBody === ''` 分支) | `strategy-draft-domain.spec.ts` "還沒載入過任何策略，且內容完全空白/只有空白字元時不必問" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03a | US-03 改種類換掉第一個 Calculate 的回傳型別 | 那一行的回傳型別變成新種類的，函式主體不動 | `indicator-script-domain.ts:124-130` (`retargetReturnType`) + `IndicatorCalculationPanel.vue` (`retargetResultType` 於 `@update:model-value`) | `indicator-script-domain.spec.ts` "把第一個 Calculate 進入點的回傳型別換成新種類的，函式主體不動" + `indicator-calculation-service.spec.ts` "改指標值種類：把第一個 Calculate 的回傳型別換成新選的" + `IndicatorCalculationPanel.spec.ts` "挑了 X，可編輯區的 Calculate 簽章跟著換" + "改種類只換 Calculate 的簽章，函式主體與其他行不動" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03b | US-03 helper 函式不受影響 | 只有 Calculate 那一行的回傳型別變，helper 不動 | `retargetReturnType` 用 regex 只換第一個符合 `func Calculate(data []indicator.KCandle) …  {` | `indicator-script-domain.spec.ts` "進入點之前的 helper 函式不受影響" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03c | US-03 沒有符合的進入點那一行時不動它 | 可編輯區一字不動 | `retargetReturnType` 的 `if (!PATTERN.test(...)) return scriptBody` | `indicator-script-domain.spec.ts` "主體裡沒有符合的進入點那一行時，一字不動" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04a | US-04 載入存了整個 Calculate 函式的策略 | 可編輯區 = 那一整個 Calculate 函式；唯讀區照舊 | `indicator-script-domain.ts:155-166` (`disassemble` 錨定 `FRAME_HEADER`) | `indicator-script-domain.spec.ts` disassemble round-trip (`it.each` 五種) + `strategy-application.spec.ts` "把每一支收成畫面看得懂的形狀"（round-trip 回 `scriptBody`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04b | US-04 載入一支用舊編輯器存的策略 | 可編輯區顯示成 `func Calculate(...) 形狀 {` + 內容 + `}`；不需遷移 | `disassemble` — 舊算式前七行與 `FRAME_HEADER` 相同故認得，主體剛好是整個函式 | `indicator-script-domain.spec.ts` "舊編輯器存的算式（外框含 func Calculate 那一行）認得，主體剛好是整個函式" | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04c | US-04 認不出最上面那一塊 | 整段原樣帶入可編輯區；畫面告知認不出外框 | `disassemble` 回 `{ body: script, frameRecognised: false }` → `StrategyDto.frameRecognised` → UI 通知（既有機制未變） | `indicator-script-domain.spec.ts` "認不出最上面那一塊時整段原樣交還" (`it.each`：非七行 / 多一個匯入 / 空字串) | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | US-05 可編輯區從唯讀區之後開始編號 | 唯讀區 7 行 → 可編輯區第一行是第 9 行（含一個分隔空行） | `indicator-script-template-dto.ts:26-28` (`bodyStartLineNumber = frameHeaderLineCount + 2`) + `IndicatorScriptEditor.vue`（frame 顯示 `frameHeader + '\n'`，body `start-line-number` 接續） | `indicator-script-domain.spec.ts` "外框七行，主體從第九行開始" + `IndicatorScriptEditor.spec.ts` "行號連著整份檔案數下去，主體從第九行開始" | asserts-oracle | produces-oracle | ✅ conforms |
| BR-1 | 唯讀區固定七行 | 見 AC-01a/b | `FRAME_HEADER` | AC-01 tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 可編輯區 = 檔案主體；送出 = 唯讀區 + 空行 + 主體 | 見 AC-01c；`assemble` 中間留空行 | `indicator-script-domain.ts:141-143` | `indicator-script-domain.spec.ts` "把主體接在唯讀外框後面，中間留一個空行，不縮排、不加收尾" | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 空白 stub 帶對應形狀 | 見 AC-02a/b | `blankBody()` + `calculateSignature()` | AC-02 tests + `indicator-calculation-service.spec.ts` (`it.each` 四種 + signal) | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 改種類重打第一個 Calculate 簽章；找不到不動 | 見 AC-03a/b/c | `retargetReturnType` | AC-03 tests | asserts-oracle | produces-oracle | ✅ conforms |
| BR-5 | 未儲存判斷：空白 / 未改動 stub 都不算 | 見 AC-02c/d；其餘算 | `strategy-draft-domain.ts:31-49` | `strategy-draft-domain.spec.ts` "還沒載入過任何策略，但已經在 stub 裡寫了東西時要問" + AC-02c/d | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 拆解：以七行開頭 → 主體；否則整段 + 標記認不出；舊算式認得 | 見 AC-04a/b/c | `disassemble` | AC-04 tests + round-trip 測試 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 範例內容是一整個 Calculate 函式，簽章頂格 | `exampleBody()` = `calculateSignature()` + 內部行（縮一層）+ `}` | `indicator-script-domain.ts:113-118` | `indicator-script-domain.spec.ts` "範例主體是一整個 Calculate 函式" + `IndicatorCalculationPanel.spec.ts` "按下帶入範例內容會填入一整個 Calculate 函式，但不含固定外框" | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-perf | 改種類是純字串處理 | 無 I/O | `retargetReturnType` 同步 regex | 既有測試同步、無 mock 網路 | asserts-oracle | produces-oracle | ✅ conforms |
| NFR-compat | 舊編輯器策略不需遷移；後端不受影響 | 見 AC-04b；後端收整段算式 | `disassemble` 認得舊算式；`assemble` 產完整檔案 | AC-04b test；後端測試（另一 repo）未動 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans (code with no clause)

| Code | Description | Verdict |
|------|-------------|---------|
| `retargetReturnType` 的 `if (!PATTERN.test(scriptBody)) return scriptBody` | `.replace` 對無符合的字串本來就原樣回傳，這個 guard 行為上是多餘的 | 保留為意圖說明（對應 BR-4「找不到就一字不動」），非缺陷、非 scope creep。若日後簡化，落點在此 |
| `IndicatorScriptEditor.vue` `frameWithSeparator` (`frameHeader + '\n'`) | 唯讀編輯器多顯示一行空白，讓行號在第 8 行落在分隔空行、主體從第 9 行起 | 支援 AC-05（行號接續），ARCH §5 已載明「中間留一個空行」 |

Out-of-scope 邊界檢查，**未違反**：未讓使用者自訂匯入（`FRAME_HEADER` 固定三個）；前端未做 Go 語法檢查（空主體由既有「去空白後不得為空」擋，缺 `Calculate` 交後端）；後端零改動；未混用多種指標值種類。

## Summary

- Conforms: 22/22 clauses ✅ (100%)
- Violations: none 🔴
- Mis-asserted: none 🟠
- Partial: none 🟡
- Gaps: none ❌
- Unclear: none ❔
- Orphans: 0（2 項支援型細節，均已說明）

第一次審計時 AC-02b（第一次進畫面的 stub）只有 domain 層測試、缺 panel 層；已補
`IndicatorCalculationPanel.spec.ts` "第一次進畫面時，可編輯區已經有一個空的 Calculate stub"。
沒有行為缺陷。
