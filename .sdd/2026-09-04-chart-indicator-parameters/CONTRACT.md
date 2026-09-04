# 在 K 線圖表上調策略的旋鈕 — Contract Verification

**Oracle**：`PRD.md` §3 的 Gherkin 驗收條件（28 條）。
**Phase 2 紀錄**：oracle 於任何實作之前寫在 scratchpad 的 `oracle-chart-parameters.md`
（獨立性關卡的證據），本矩陣的「Oracle」欄逐條沿用它，未依實作回頭改寫。

**判定方式**：測試對照 oracle、程式對照 oracle，**兩邊各自獨立**判定；
不以「測試綠了」當作符合。

---

## 1. Clauses

檔案簡稱：`P` = `tests/components/organisms/KCandleChartPanelParameters.spec.ts`、
`I` = `tests/components/organisms/KCandleChartPanelIndicators.spec.ts`、
`uci` = `app/composables/use-chart-indicators.ts`。

### US-01 套上去之前就先調

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-01.1 | 挑一支有旋鈕的策略，先看到那幾格 | 出現「期數」＝20，**且還沒上圖**（沒有任何計算發生） | `uci:applyIndicator`（`!prepared.readyToApply` → 停在待調整） | `P:130` | asserts-oracle | produces-oracle | ✅ |
| AC-01.2 | 調好之後才上圖，算的是調過的值 | 上圖並算一次，**用的期數是 60** | `uci:confirmPendingIndicator` → `chart-indicator-service.ts`（送 `appliedIndicator.parameters`） | `P:144` | asserts-oracle | produces-oracle | ✅ |
| AC-01.3 | 一個旋鈕都沒有就直接上圖 | 直接上圖並算一次，**中間不多一步** | `applied-indicator-dto.ts:readyToApply` | `P:157` | asserts-oracle | produces-oracle | ✅ |
| AC-01.4 | 上次調過的值是這次的起點 | 那一格是 **60**，不是策略的 20 | `applied-indicator-parameters-domain.ts:toDtos` | `P:169`；`tests/domain/models/domains/applied-indicator-parameters-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ |
| AC-01.5 | 存不了東西時照樣運作 | 那一格是 **20**；調得動、算得出來，**沒有任何錯誤** | `strategy-parameter-value-preference-proxy.ts` 的 `try/catch` | `P:181`＋`tests/infrastructure/proxy/strategy-parameter-value-preference-proxy.spec.ts`（讀寫各一條） | asserts-oracle | produces-oracle | ✅ |
| AC-01.6 | 不改動策略記著的預設值 | 那支策略的預設值**仍然是 20** | 值只進 `ChartIndicatorRequestDto` 與偏好儲存，**不經過任何存策略的路徑** | `P:199`（斷言 `updateStrategy`／`createStrategy` **一次都沒被叫到**） | asserts-oracle | produces-oracle | ✅ |

### US-02 同一支可以擺好幾次

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-02.1 | 已套用的仍然挑得到 | 那支**仍然在**可挑清單裡 | `uci:selectableStrategies`（過濾整個移除） | `I:149` | asserts-oracle | produces-oracle | ✅ |
| AC-02.2 | 同一支擺第二次 | 清單**兩筆**、圖上**兩條線** | 五處鍵改用 `appliedIndicatorId` | `P:237`；`I`（同一支挑第二次那一條） | asserts-oracle | produces-oracle | ✅ |
| AC-02.3 | 用值分辨它們 | 一筆標**期數 20**、另一筆**期數 60** | `applied-indicator-dto.ts:parameterSummary` | `P:247`；`tests/domain/models/dto/applied-indicator-dto.spec.ts` | asserts-oracle | produces-oracle | ✅ |
| AC-02.4 | 移除其中一筆只影響那一筆 | 只剩另一筆；圖上只剩它那條線 | `uci:removeAppliedIndicator` | `P:258`；`I:188`（交給圖表的線只剩序號 2） | asserts-oracle | produces-oracle | ✅ |
| AC-02.5 | 沒有旋鈕的也可以擺兩次 | **兩筆**，名稱相同、**沒有值可標** | 同上；`parameterSummary` 為空字串 | `P:271` | asserts-oracle | produces-oracle | ✅ |
| AC-02.6 | 兩條線預設就分得開 | 兩條線**不同顏色**，一次都沒挑過 | `chart-line-color-domain.ts` 規則三（避開已用） | `P:283`；`P:455`（曲線那條路） | asserts-oracle | produces-oracle | ✅ |

### US-03 調完之後

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-03.1 | 只有那一筆重算 | **只有均線那一筆重算**；布林那條線一個點都沒變 | `uci:changeAppliedParameterValue` → `calculateOne(changed)` | `P:328` | asserts-oracle | produces-oracle | ✅ |
| AC-03.2 | 改過的值下次還在 | 重新打開挑那一支時是 **60** | `rememberAppliedIndicatorParameters` ＋ `toDtos` | **三條接力**：`P:349`（寫）→ proxy spec（存進去讀得回來）→ `P:169`（讀成起點） | asserts-oracle | produces-oracle | ✅ |
| AC-03.3 | 清單不留存 | 清單是**空的**；圖上只有 K 線 | **不做任何事**（沒有任何寫入清單的路徑） | `I:201`／`I:285`／`I:338`（一支都沒套用時的三種情況） | asserts-oracle | produces-oracle | ✅ |
| AC-03.4 | 記住最後設定的那一個 | 那一格是 **60**（後設的那個） | 逐個名稱寫入，後寫蓋前寫 | `applied-indicator-parameters-domain.spec.ts`（`toHaveBeenLastCalledWith`） | asserts-oracle | produces-oracle | ✅ |

### US-04 策略的旋鈕被改過之後

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-04.1 | 多宣告了一個 | 期數 **60**、倍數 **2** | `applied-indicator-parameters-domain.ts`（走宣告） | domain spec | asserts-oracle | produces-oracle | ✅ |
| AC-04.2 | 不再宣告某個旋鈕 | **沒有**那一格；記住的值**不參與計算** | 同上（記憶裡有、宣告裡沒有的丟掉） | domain spec | asserts-oracle | produces-oracle | ✅ |
| AC-04.3 | 旋鈕被改名 | **只有「週期」一格，值是 20** | 同上（改名＝少一個舊的、多一個新的） | domain spec | asserts-oracle | produces-oracle | ✅ |

### US-05 算不出來的時候

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-05.1 | 名字對不上就地指名 | 那一筆旁邊說明「**期數**」沒被宣告；**沒有它的線** | `uci:messageOf` × 以套用為鍵的 `failureMessages` | `P:372` | asserts-oracle | produces-oracle | ✅ |
| AC-05.2 | 與「算式跑不動」是兩則 | 說明指出**哪一個名字**；**沒有**說算式跑不動 | 同上（上一個切片建立的錯誤分流） | `P:372`（斷言不含「算式執行失敗」） | asserts-oracle | produces-oracle | ✅ |
| AC-05.3 | 只有失敗那一次沒有線 | **只有失敗那一筆**帶說明；另一筆照樣畫 | 鍵換掉之後自然成立 | `P:386` | asserts-oracle | produces-oracle | ✅ |
| AC-05.4 | 失敗的留在清單上，下次重算再試 | 跟著重算；算得出來時說明消失、線出現 | 既有行為，對每一筆各自成立 | `I:393` | asserts-oracle | produces-oracle | ✅ |
| AC-05.5 | 收掉上一輪那條線 | 上一輪那條線**被收掉**，原地換成說明 | `calculateOne` 的 catch 先濾掉自己那一筆 | `I:411` | asserts-oracle | produces-oracle | ✅ |

### US-06 顏色盡量別撞

| ID | 條款 | Oracle | 實作 | 測試 | 測試 | 程式 | Status |
|---|---|---|---|---|---|---|---|
| AC-06.1 | 挑過的照挑的畫 | 那條線是**藍色** | `chart-line-color-domain.ts` 規則二 | `chart-line-color-domain.spec.ts`（含「即使被別條線用掉」那一條） | asserts-oracle | produces-oracle | ✅ |
| AC-06.2 | 第二次不沿用記住的 | 第二條線**不是藍色**，是沒被用掉的 | 規則一（`drawnLines.alreadyDraws(lineKey)`） | `P:295`；`chart-line-color-domain.spec.ts`（三條：同一條線／別條線／沒挑過） | asserts-oracle | produces-oracle | ✅ |
| AC-06.3 | 移除第一筆後記住的顏色回來 | 那條線是**藍色** | 同上（圖上已經沒有那條線了） | `P:311` | asserts-oracle | produces-oracle | ✅ |
| AC-06.4 | 顏色用光照樣畫 | **照樣畫得出線**；顏色與別條重複 | `FALLBACK_CHART_LINE_COLOR` | `chart-line-color-domain.spec.ts` | asserts-oracle | produces-oracle | ✅ |

---

## 2. Orphans

| 行為 | 位置 | 判定 |
|---|---|---|
| 值不合法時就地說明、完全不算（待上圖那一筆） | `uci:confirmPendingIndicator`；`P:210` | **未列於契約的既有行為延伸**。PRD 沒有明寫這一條，但它是上一個切片「回看根數必須是大於零的整數」那條規則在這個畫面的必然結果——不擋就會送出一個註定失敗的請求。保守方向正確，記為應補進契約的一條。 |
| 已經在圖上那一筆改成不合法的值時不重算、也不換掉它 | `uci:changeAppliedParameterValue`；`P:416` | 同上。 |
| 取消待上圖的那一筆 | `uci:cancelPendingIndicator`；`P:223` | 兩段式流程的必然配套：既然可以停下來，就必須可以不繼續。PRD 未列，記為應補進契約的一條。 |
| 把一格清空時不當成填了零 | `AppliedIndicatorParameterFields.vue` × `readNumberInput`；`P:402` | 上一個切片建立的既有行為，跨畫面沿用。 |

**Out of Scope 對照**：PRD §1 明列不做「在圖表上編輯旋鈕宣告」「把已套用的清單存起來」
「旋鈕的型別系統」「把多次套用群組起來呈現」。程式中**沒有**任何一項的實作，無越界。

---

## 3. 兩條被取代的既有規則（刻意的行為變更，不是回歸）

來源：`.sdd/2026-09-03-chart-indicator-overlay/`。兩處既有測試已反過來斷言。

| 舊規則 | 現在 | 為什麼 |
|---|---|---|
| 同一支策略**不重複套用** | **可以擺任意多次**（`I` 那條測試已改為斷言「多出一筆、各自算一次」） | 舊規則的前提是「同一支只畫得出同一條線」，旋鈕讓那個前提不成立。擋掉它，使用者就永遠擺不出他真正想要的第二筆。 |
| 已套用的**不再出現在可挑清單裡** | **仍然出現**（`I:149` 已改為斷言 `toBe(true)`） | 同一個理由的另一面。 |

**沒有被推翻的那一條**：「一條線挑過的顏色即使已經被**別條線**用掉也照樣採用」
仍然成立、仍然綠（`chart-line-color-domain.spec.ts` 那一條一個字都沒改）。
本切片只是在它**之前**多了一條例外——**同一條線已經在圖上**。
兩者只差一個字：是不是同一條線。搞混它們的後果剛好相反：
把例外寫寬一格，使用者明明挑好的顏色會被系統擅自換掉。

---

## 4. 收尾重構是否影響判定

`AppliedIndicatorRowDto` 把「每一列此刻的樣子」併成一份，**過程中一條測試都沒改**。
逐條檢查後：**沒有任何條款是只由重構後的形狀滿足的**——每一條的 oracle 都落在
行為上（算了幾次、圖上有幾條線、旁邊寫著什麼），而那些斷言在重構前後一字不差。
重構只換掉了畫面**怎麼拿到**那些事實，沒有換掉那些事實本身。

---

## 5. Summary

| Status | 數量 |
|---|---|
| ✅ conforms | 28 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 0 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 4（皆良性，其中 3 條建議補進契約） |

**Conformance：28/28 = 100%**

覆蓋率（`@vitest/coverage-v8` 實測，切片動過的檔案）：
statements 99.66% / branches 99.21% / functions 100% / lines 99.65%。
唯一未覆蓋的 `use-chart-indicators.ts:274` 是**既有死碼**（型別收窄用的那一行，
面板在載入當下就已設好正在看的那一段，所以走不到），本切片沒有動它——
`git diff` 可證，理由與回頭訊號已記在 ARCH。
`bun run verify` 全綠（956 條）。

**天花板**：這是一次**靜態**符合性稽核——它以規格推出的預期結果去讀測試碼與產品碼，
不執行它自己發明的情境。要動態證明某一條，走 `/tdd`。
