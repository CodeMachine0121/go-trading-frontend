# 圖上擺著的那幾支指標要記得住 — Contract Conformance

**PRD:** [`PRD.md`](PRD.md) · **ARCH:** [`ARCH.md`](ARCH.md)
**Oracle:** PRD 第 3 節的 24 條 Gherkin 驗收條件
**Verdict:** 24 / 24 conformant · 0 gap · 0 orphan · 1 已知取捨（見下方）

判定方式：**先只看 PRD 推出「應該發生什麼」，再獨立判斷測試是否真的斷言了那件事、
以及產品程式碼是否真的產出那件事。** 測試名稱不算證據，斷言才算。

---

## Traceability Matrix

| # | Scenario (PRD) | 守著它的測試 | 產出它的程式碼 | Verdict |
| :-- | :--- | :--- | :--- | :--- |
| **US-01 上次那幾支自己回到圖上** | | | | |
| 1 | 一筆回來 | `KCandleChartPanelRestore` 一筆回來，帶著它留存的值並算了一次 | `KCandleChartPanel` onMounted → `useChartIndicators.restoreAppliedIndicators` | CONFORMANT |
| 2 | 好幾筆依原來的順序回來 | 同上 好幾筆依留存的順序回來；`RememberedAppliedIndicatorsDomain` 好幾筆依留存的順序回來 | `toAppliedIndicatorDtos` 走的是留存的順序 | CONFORMANT |
| 3 | 同一支的兩筆各自帶著自己的值回來 | 同上 同一支的兩筆各自帶著自己的值回來，各算一次（斷言送去計算的**兩個不同期數**） | 留存帶每一筆各自的值，不查旋鈕習慣值 | CONFORMANT |
| 4 | 移除過的那一筆不回來 | `KCandleChartPanelRestore` 移除一筆之後留存的只有剩下的那一筆＋`AppliedChartIndicatorPreferenceProxy` 寫進去的那幾筆讀得回來 | `removeAppliedIndicator` → `rememberAppliedIndicators` | CONFORMANT（兩段合成：寫對了什麼＋寫進去讀得回來） |
| 5 | 改過的值就是回來時的值 | 同上 改一筆的值之後留存的是新的值＋proxy 往返 | `changeAppliedParameterValue` → `rememberAppliedIndicators` | CONFORMANT（同上，兩段合成） |
| 6 | 一支都沒擺過時清單是空的 | 一筆都沒留存時清單是空的，一次計算都沒發生 | `restoreAppliedIndicators` 空的就直接回頭 | CONFORMANT |
| 7 | 還在調旋鈕、還沒加入的那一筆不算擺過 | 還在調旋鈕、還沒按加入的那一筆不寫 | 只有 `addToChart` 才寫；待上圖那一筆不經過它 | CONFORMANT |
| **US-02 什麼時候寫下來** | | | | |
| 8 | 加入一筆就寫下來 | 加入一筆之後留存的是那一筆 | `addToChart` | CONFORMANT |
| 9 | 移除一筆就寫下來 | 移除一筆之後留存的只有剩下的那一筆 | `removeAppliedIndicator` | CONFORMANT |
| 10 | 改一筆的值就寫下來 | 改一筆的值之後留存的是新的值 | `changeAppliedParameterValue` | CONFORMANT |
| 11 | 值填得用不了的時候不寫 | 值填得用不了的時候不寫，但畫面顯示他剛打的東西（兩件都斷言）＋**填了用不了的值之後移除另一筆／再加一筆／改回能用的**三條 | 驗證不過就先回頭；唯一的寫入點寫的是每一筆**最後一次用得了**的樣子 | CONFORMANT（初版不符，見下方缺陷 1） |
| **US-03 這台瀏覽器不讓存東西時** | | | | |
| 12 | 寫不進去不影響這一次 | `AppliedChartIndicatorPreferenceProxy` 寫不了時不影響這一次的操作 | proxy 的 `catch` 吞掉 | CONFORMANT |
| 13 | 讀不出來就當成沒擺過 | 同上 讀不了時當成沒擺過＋`KCandleChartPanelRestore` 留存讀不出來時清單是空的 | proxy 的 `catch` 交出空的一份 | CONFORMANT |
| **US-04 策略在這段時間裡被改過** | | | | |
| 14 | 策略被刪掉的那一筆不回來 | `RememberedAppliedIndicatorsDomain` 策略已經被刪掉的那一筆不回來＋`KCandleChartPanelRestore` 同名情境（另斷言沒有錯誤呈現） | `restorableStrategiesOf` 對不上就交出零個 | CONFORMANT |
| 15 | 現在畫不成線的那一筆不回來 | 同上兩支各一條 | `restorableStrategiesOf` 的 `drawableOnChart` | CONFORMANT |
| 16 | 多宣告一個旋鈕時新的那一格用預設值 | `RememberedAppliedIndicatorsDomain` 策略多宣告了一個旋鈕時… | `toAppliedIndicatorDtos` 逐條走**宣告** | CONFORMANT |
| 17 | 不再宣告某個旋鈕時留存的值整個消失 | 同上 策略不再宣告某個旋鈕時… | 同上（走宣告，留存裡多的名字走不到） | CONFORMANT |
| 18 | 旋鈕被改名時舊值丟掉、新名字用預設值 | 同上 旋鈕被改名時… | 同上（改名＝少一個舊的、多一個新的） | CONFORMANT |
| 19 | 策略改名時用現在的名字 | 同上 策略改過名字時用現在的名字 | 交出的是**現在**那份 `StrategyDto` | CONFORMANT |
| **US-05 留存的東西壞掉時** | | | | |
| 20 | 整份讀不出來就當成沒擺過 | `AppliedChartIndicatorPreferenceProxy` 四種壞法（壞 JSON／物件／字串／數字） | `Array.isArray` 擋下＋`catch` | CONFORMANT |
| 21 | 其中一筆讀不出來就跳過那一筆 | 同上 五種壞法（缺識別碼／非數字／非整數／非物件／null） | `toRememberedAppliedIndicatorVos` 交出零個 | CONFORMANT |
| 22 | 某一格的值用不了時退回預設值 | `RememberedAppliedIndicatorsDomain` 三種用不了的回看根數＋「同一筆其他格照樣採用」 | `toParameter` 問 `StrategyParameterDomain.validationMessage()` | CONFORMANT |
| **US-06 既有的兩種記憶不變** | | | | |
| 23 | 回來的那一筆用挑過的顏色 | `KCandleChartPanelRestore` 回來的那一筆用挑過的顏色 | 配色仍在 `ChartIndicatorDomain`，本切片沒動 | CONFORMANT |
| 24 | 挑一支新的仍然帶上次調過的值 | `KCandleChartPanelParameters` 上次調過的值就是這次那一格的起點（既有測試，仍然綠） | `AppliedIndicatorParametersDomain` 沒動 | CONFORMANT |

---

## 非功能要求

| 要求 | 守著它的測試 | Verdict |
| :--- | :--- | :--- |
| 不擋主功能（讀寫失敗都不影響圖表） | #12、#13，以及「取不到策略清單時清單是空的，圖表本身照畫」 | CONFORMANT |
| 不多打一趟後端 | `ChartIndicatorService` 不為了還原多打一趟後端——策略清單是收進來的 | CONFORMANT |
| 還原後只算一次 | `KCandleChartPanelRestore` 行情到手時不等停手就補算（`toHaveBeenCalledTimes(1)`）＋**行情延後 0–3 個微任務回來時也只算一次**（四向參數化） | CONFORMANT（初版不符，見下方缺陷 2） |
| 順序穩定 | #2 | CONFORMANT |

## 風險項的落地驗證

| ARCH 列的風險 | 守著它的測試 |
| :--- | :--- |
| 行情與策略清單誰先回來不確定 | 策略清單先回來、行情後到：那幾筆在行情到手時被補算；一筆都沒留存時行情到手不會憑空算一次 |
| 用留存的清單去推「這支上次調成什麼」 | #3（兩筆的期數是 20 與 60，不是兩個 60） |
| 留存裡混進用不了的值 | #22 |
| 把種類也留存下來 | `AppliedIndicatorDto` 種類不帶走；proxy 種類不寫進去 |

---

## 被測試抓出來的缺陷

### 實作過程中

| 缺陷 | 怎麼被抓到 | 修法 |
| :--- | :--- | :--- |
| **回不來的那一筆佔掉一個序號**，導致還原之後手動加入的那一筆與回來的那一筆撞號——撞號後移除任何一筆會讓**兩筆一起消失**，而且不報錯 | 元件層「有筆被跳過時後續挑的那一支也不撞號」（先紅後綠） | 先濾掉回不來的那幾筆，再依剩下的順序發號；「這一筆回得來嗎」收進單一 helper，不在兩處各判斷一次。另補三向參數化測試（回不來的是第一／中間／最後一筆） |

### PR review（#18）

三個都先寫成紅的測試再修。

| # | 缺陷 | 違反的條款 | 修法 |
| :-- | :--- | :--- | :--- |
| 1 | **「不寫」擋不住下一次寫入。** 值用不了那一次不寫（正確），但畫面上那一份仍帶著那個值，而清單的下一次改動（移除、加入）寫的是**整份**——於是它照樣被寫下去。下次打開時它退回策略的**預設值**，使用者自己調過的那個值就這樣消失了，且不報錯 | US-02「值填得用不了的時候不寫；留存的內容仍然是期數 20」 | `useChartIndicators` 另記**每一筆最後一次「值用得了」的樣子**（以序號為鍵的查詢表），唯一的寫入點寫的是「成員與順序照畫面上那一份、值照最後一次用得了的」。查詢表不是第二份清單，要寫的那一份由畫面上那一份推導，因此不會漂移 |
| 2 | **還原時同一批被算兩遍。** 還原「附加整份、再逐筆 `await`」，而每個 `await` 都是空檔；行情的續段落在裡面時，補算會與還原的迴圈同時跑。後端負載加倍，且兩次都對著空的 `chartIndicators` 配色，短暫配到同一個顏色——兩次都畫得出線，圖上沒有任何異狀 | NFR「還原後只算一次…不因為『還原』與『第一次擺好位置』而算兩遍」 | 還原一進來就先看「算哪一段」在不在：不在就只放進清單、直接回頭，計算全交給第一次擺好位置那條路 |
| 3 | **「零個或一個」只由註解保證。** `restorableStrategiesOf` 交出陣列，發號用的是筆數——策略清單裡若出現兩支同識別碼，兩筆會共用同一個序號，正是上面那個已修過的撞號 | 無直接條款（是缺陷 0 的復發面） | 交出前 `.slice(0, 1)`，讓「一筆只回得來一次」由結構保證 |

**未修（記錄在案）**：review 的第 3 項——回不來的那幾筆會被下一次寫入永久抹掉。
理由與真要修的落點見 [`ARCH.md`](ARCH.md) 第 10 節。

## Orphans

無。本切片新增的每一段產品程式碼都對應到至少一條驗收條件；
`RememberedAppliedIndicatorsDomain` 私有的 `restorableStrategiesOf` 與 `toParameter`
各由 #14/#15 與 #16–#19/#22 覆蓋。
