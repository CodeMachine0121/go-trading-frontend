# Contract Traceability Matrix — 算式收到的 K 線有哪些欄位

Contract: `PRD.md`
Design map: `ARCH.md`
Implementation: `app/domain/models/vo/k-candle-field-vo.ts`、`app/domain/models/dto/k-candle-field-dto.ts`、
`app/domain/service/indicator-calculation-service.ts`、`app/application/indicator-calculation-application.ts`、
`app/components/molecules/KCandleFieldReference.vue`、`app/components/organisms/IndicatorCalculationPanel.vue`
Oracle: Acceptance Criteria（6 個情境）

## Clauses

`Spec-expected` 欄是只讀規格文字得出的業務可觀察結果；`Impl` / `Test` 欄是把它橋接到程式碼之後查到的位置。

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-01 | 逐一列出每一個欄位 | `Close` / `float64` / 收盤價、`TakerBuyQuoteVolume` / `float64` / 主動買入額 都看得到 | `k-candle-field-vo.ts` 的 `K_CANDLE_FIELDS`；`KCandleFieldReference.vue` | `indicator-calculation-service.spec.ts`「列出算式收到的每一個欄位」（十個名字逐一比對）、`IndicatorCalculationPanel.spec.ts`「把算式收到的每一個欄位列在編輯區旁邊」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-02 | 時間是 Unix 秒的整數 | 名字 `OpenTimeUnixSeconds`、型別 `int64` | `K_CANDLE_FIELDS` 第二列 | `indicator-calculation-service.spec.ts` 的 `it.each`（含「沙箱沒有 time 可以匯入」的理由） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-03 | 不列出算式看不到的東西 | 清單裡沒有 `ID`，也沒有 `OpenTime` | `K_CANDLE_FIELDS` 刻意不含這兩個（註解說明理由） | `indicator-calculation-service.spec.ts`「不列出資料庫那張表才有的東西」、`IndicatorCalculationPanel.spec.ts`（畫面上也沒有 `ID`） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-04 | 說法與 K 線瀏覽一致 | 每個欄位都有給人看的名字，`Close` 是「收盤價」 | `K_CANDLE_FIELDS` 的 label 沿用 `KCandleTable` 的欄位標題 | `indicator-calculation-service.spec.ts`「每一個欄位都帶一個給人看的名字」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-05 | 點出它是算式看得到的形狀 | 說出不是資料庫那張表，並點出時間與價量的型別差異 | `KCandleFieldReference.vue` 的 `__note` | `IndicatorCalculationPanel.spec.ts`「說出它是算式看得到的形狀」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-06 | 標出算式收到的參數形式 | 標出 `data []indicator.KCandle` | `KCandleFieldReference.vue` 的 `#meta` | 同上（斷言畫面上有那一行） | asserts-oracle | produces-oracle | ✅ conforms |

## Notes

- 這份清單對應後端的 `internal/domain/models/vo/k_candle_vo.go`（`vo.KCandleVo`），
  它是 `yaegi_indicator_script_proxy.go` 以 `indicator.KCandle` 之名注入沙箱的那個型別。
  **不是** `internal/domain/models/entities/k_candle.go`（資料庫那張表）。後端改前者時這份清單要跟著改。
- 沒有 gap、沒有淺測試、沒有行為違規。`bun run verify` 全綠（650 個測試）。
