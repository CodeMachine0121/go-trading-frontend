# 策略庫 — Contract Verification

**Contract source:** `.sdd/2026-09-03-strategy-library/PRD.md`（Section 3 Acceptance Criteria 為 oracle）
**Design map:** `ARCH.md`（Traceability 表用來定位程式碼，非契約本身）
**Glossary:** `.sdd/UL-MAP.md`
**Ceiling:** 這是**靜態一致性稽核**——逐條把「測試斷言的東西」與「程式碼實際產出的東西」分別對照規格推導出的 oracle，
不以測試全綠作為判準，也不執行自己發明的情境。已跑的僅是對照條款所映射的那一支測試作為佐證。

---

## 判定摘要

| 判定 | 數量 |
| :--- | ---: |
| ✅ conforms | 38 |
| 🔴 violation | 0 |
| 🟠 mis-asserted | 0 |
| 🟡 partial | 0 |
| ❌ gap | 0 |
| ❔ unclear | 0 |
| ⚠️ orphan | 0 |

**Conformance: 38 / 38 = 100%**

初次稽核為 33 ✅ / 5 🟡。五條「PRD 講了但沒有測試釘住」已於稽核後補上，
每一條都經反向驗證（破壞行為 → 對應測試轉紅 → 還原）。詳見文末〈稽核後的補強〉。

---

## Clauses

檔案縮寫：
`script` = `app/domain/models/domains/indicator-script-domain.ts`、
`sDom` = `app/domain/models/domains/strategy-domain.ts`、
`wDom` = `app/domain/models/domains/strategy-write-domain.ts`、
`draft` = `app/domain/models/domains/strategy-draft-domain.ts`、
`svc` = `app/domain/service/strategy-service.ts`、
`proxy` = `app/infrastructure/proxy/strategy-proxy.ts`、
`lib` = `app/composables/use-strategy-library.ts`、
`panel` = `app/components/organisms/IndicatorCalculationPanel.vue`、
`picker` = `app/components/molecules/StrategyPicker.vue`、
`nameDlg` = `app/components/molecules/StrategyNameDialog.vue`、
`libDlg` = `app/components/molecules/StrategyLibraryDialog.vue`

測試縮寫：
`Tpanel` = `tests/components/organisms/IndicatorCalculationPanelStrategy.spec.ts`、
`Tapp` = `tests/application/strategy-application.spec.ts`、
`Tscript` = `tests/domain/models/domains/indicator-script-domain.spec.ts`、
`Tdraft` = `tests/domain/models/domains/strategy-draft-domain.spec.ts`、
`Twrite` = `tests/domain/models/domains/strategy-write-domain.spec.ts`、
`Tent` = `tests/domain/models/entities/strategy.spec.ts`、
`Tproxy` = `tests/infrastructure/proxy/strategy-proxy.spec.ts`、
`Tpicker` / `TnameDlg` / `TlibDlg` = 對應的 `tests/components/molecules/*.spec.ts`

### US-01 挑一支策略來用

| ID | Clause | Oracle（只由規格推導） | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-01 | 挑一支策略就把它記住的東西全部帶進畫面 | 編輯區出現該算式內容；種類、刻度、根數三項同時變成該策略記的值；畫面顯示使用中的是它 | `lib.loadStrategy`、`panel.applyContent` | `Tpanel`「挑一支就把它記住的四樣東西全部帶進畫面」 | ✅ |
| AC-02 | 挑策略不會動到交易標的 | 交易標的維持原值 | `StrategyContentDto`（**型別上就沒有交易標的**） | `Tpanel`「挑一支不會動到交易標的」 | ✅ |
| AC-03 | 一支策略都沒有 | 明說還沒有任何策略，且不視為錯誤 | `picker`（空狀態） | `Tpicker`「一支都沒有時說出來，而不是給一個空選單」 | ✅ |
| AC-04 | 編輯區還沒動過時直接帶入 | 直接帶進畫面，不出現任何確認 | `draft.hasUnsavedChanges` | `Tpanel`「編輯區還沒動過時直接帶入，不多問」 | ✅ |

### US-02 不要弄丟我寫到一半的東西

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-05 | 有未儲存的變更時先確認 | 出現要求確認的畫面，欄位尚未改變 | `lib.selectStrategy` → `draft` | `Tpanel`「載入了一支又改過它，再挑另一支時要問」 | ✅ |
| AC-06 | 使用者選擇不放棄 | 畫面完全不變，仍是原本那一支與改過的內容 | `lib.closeDialog` | `Tpanel`「說不要放棄時畫面完全不變」 | ✅ |
| AC-07 | 使用者選擇放棄 | 換成新挑的那一支，原本的改動不再保留 | `lib.confirmDiscard` | `Tpanel`「說要放棄時才換成新挑的那一支」 | ✅ |
| AC-08 | 沒有改過就不問 | 不要求確認，直接換過去 | `draft.hasUnsavedChanges` | `Tpanel`「載入之後一個字都沒改，再挑另一支不再問」 | ✅ |
| AC-09 | 沒有使用中策略但編輯區已經寫了東西 | 先要求確認是否放棄那些內容 | `draft`（無快照時內容非空即視為有東西可弄丟） | `Tpanel`「已經寫了東西時先問過再覆蓋」、`Tdraft` | ✅ |

### US-03 把改動存回去

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-10 | 存回使用中的那一支 | 那一支的根數變成 60；畫面明確回報已儲存 | `lib.saveStrategy` → `svc.saveStrategy`（帶識別碼） | `Tpanel`「有使用中的那一支時，儲存存回它而不是建立新的」 | ✅ |
| AC-11 | 沒有使用中策略時，儲存等同另存為新策略 | 畫面先詢問策略名稱 | `lib.saveStrategy`（無使用中即開取名對話框） | `Tpanel`「沒有使用中的那一支時，儲存先問名字」 | ✅ |
| AC-12 | 存成新的一支之後就換它當使用中 | 多出那一支；畫面顯示使用中的是它 | `lib.writeStrategy` | `Tpanel`「填完名字就建立一支新的，之後使用中的就是它」 | ✅ |
| AC-13 | 名稱沒填 | 不送出並說明必須填寫；已填的其他內容都還在 | `nameDlg`（畫面層）+ `wDom`（領域層） | `TnameDlg`、`Twrite`、`Tapp`「名稱⋯時一個字都不送出去」 | ✅ |
| AC-14 | 名稱與既有策略重複 | 就地說明已被使用；輸入框的字還在；對話框不關閉 | `proxy`（`409`）→ `lib`（開回取名對話框） | `Tpanel`「名稱被佔用時對話框不關閉、就地說明，畫面內容一字不動」 | ✅ |
| AC-15 | 使用中的策略已經不在了 | 說明找不到那一支，與「內容不合規則」分開呈現；編輯區一字不動 | `proxy`（`404`）→ `StrategyNotFoundError` | `Tpanel`「要存回去的那一支已經不在時說找不到」 | ✅ |
| AC-16 | 儲存時連不上後端 | 沿用既有的連線失敗說法；編輯區一字不動 | `BackendApiProxy`（既有）→ `lib.messageOf` | `Tpanel`「連不上後端時說連不上，畫面內容一字不動」 | ✅ |

### US-04 另存為新策略

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-17 | 從既有策略衍生一支新的 | 多出新的一支；**原本那一支完全沒有改變** | `lib.writeStrategy(name, undefined)` → 走建立而非改寫 | `Tpanel`「從既有的一支另存出新的一支，原本那一支不受影響」 | ✅ |
| AC-18 | 另存之後使用中的變成新的那一支 | 再按儲存存的是新的那一支 | `lib.writeStrategy` | `Tpanel`「填完名字就建立一支新的，之後使用中的就是它」 | ✅ |
| AC-19 | 另存只問名稱 | 只詢問名稱，其餘四樣取自畫面當下的值 | `nameDlg`、`lib.writeStrategy(readCurrentContent())` | `TnameDlg`「只問名稱一件事」 | ✅ |

### US-05 看看手上留了哪些策略

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-20 | 從清單載入一支 | 帶進畫面、清單關閉、仍留在指標計算畫面 | `libDlg` → `lib.selectStrategy` | `Tpanel`「打開清單看得到每一支，載入之後留在同一頁」 | ✅ |
| AC-21 | 清單依名稱排列 | 三支依名稱由小到大 | `svc.listStrategies`（**保持後端給的順序**，不重排） | `Tapp`「順序原樣沿用後端給的」、`TlibDlg`「順序照給的來」 | ✅ |
| AC-22 | 清單為空 | 明說還沒有任何策略，不視為錯誤 | `libDlg`（空狀態） | `TlibDlg`「一支都沒有時明說沒有」 | ✅ |
| AC-23 | 打開清單時連不上後端 | 說明連不上，**不呈現空清單** | `lib.refreshStrategies`（失敗不清空、寫 `listErrorMessage`） | `Tpanel`、`TlibDlg`「連不上後端時說連不上，不呈現空清單的說法」 | ✅ |

> **AC-21 的責任歸屬。** 「依名稱由小到大」是後端的保證（見後端 `CONTRACT.md` 的對應條款，
> 由 `FindAll` 的 `Order by name` 與其儲存測試釘住）。前端的義務是**不重新排序**，
> 這正是這裡兩支測試斷言的事。前端自己再排一次只會多一個會與後端漂移的地方。

### US-06 丟掉不要的策略

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-24 | 刪除前先確認 | 出現要求確認的畫面 | `lib.askToDelete` → `ConfirmDialog` | `Tpanel`「刪除前先問過；取消就不刪」 | ✅ |
| AC-25 | 使用者取消刪除 | 那一支仍在清單上 | `lib.closeDialog` | `Tpanel`（同上，並斷言 `deleteStrategy` 未被呼叫） | ✅ |
| AC-26 | 使用者確認刪除 | 那一支從清單消失 | `lib.confirmDelete` → 重新取清單 | `Tpanel`「確認刪除之後那一支就從清單上消失」 | ✅ |
| AC-27 | 刪掉的正好是使用中的那一支 | 編輯區內容留著；不再顯示使用中；之後儲存先問名稱 | `lib.confirmDelete`（只解除關聯） | `Tpanel`「刪掉正在用的那一支時，編輯區留著，之後儲存變成先問名字」 | ✅ |
| AC-28 | 刪掉別的不影響使用中的那一支 | 使用中的仍是原本那一支，內容完全沒有改變 | `lib.confirmDelete`（以識別碼比對） | `Tpanel`「刪掉別的那一支時，正在用的那一支完全不受影響」 | ✅ |
| AC-29 | 刪除時連不上後端 | 那一支仍在清單上；說明連不上 | `lib.confirmDelete`（失敗時寫 `errorMessage`、退回清單） | `Tpanel`「刪除時連不上後端，那一支仍在清單上並說明連不上」 | ✅ |

### US-07 算式帶回畫面時只留我寫的那幾行

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-30 | 載入時把每段算式都一樣的那些行拿掉 | 編輯區只出現使用者當初寫的那幾行 | `script.disassemble`、`sDom.toDto` | `Tscript`「⋯的算式拆得回當初寫的內容」、`Tent` | ✅ |
| AC-31 | 內容原有的縮排原樣保留 | 縮排與當初撰寫時完全相同 | `script.disassemble`（只退一層） | `Tscript`「內容本來就有的縮排原樣取回」 | ✅ |
| AC-32 | 認不出外框時整段原樣帶入 | 整段進編輯區；告知這一支不是在這裡寫出來的；沒有拆掉任何一行 | `script.disassemble`（回 `frameRecognised = false`）→ `lib` 的告知 | `Tscript`「認不出外框時整段原樣交還」、`Tpanel`「認不出外框的算式整段帶進來，並說出⋯」 | ✅ |
| AC-33 | 一趟來回不會讓算式長出東西或掉東西 | 存回去的算式與載入前完全相同 | `script.assemble` / `script.disassemble` 互為往返 | `Tscript`「包起來再拆開再包起來，與第一次包的完全相同」（＋反向那一支） | ✅ |

### US-08 記下這支策略要吃多粗的 K 線

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-34 | 挑的刻度存得住也讀得回來 | 再載入時刻度仍是一小時 | `StrategyContentDto`、`wDom`、`proxy`（body 帶 `aggregationInterval`） | `Tpanel`（載入帶入 `4h`）、`Twrite`、`Tproxy`（body 檢查） | ✅ |
| AC-35 | 沒挑就是五分鐘 | 記下來的是五分鐘 | `svc.defaultAggregationInterval` → `FINEST_AGGREGATION_INTERVAL` | `Tpanel`「沒挑時是五分鐘」、`Tapp`「沒特別挑時是五分鐘」 | ✅ |
| AC-36 | 挑了刻度不改變計算的行為 | 計算仍以五分鐘執行；畫面早已標明尚未生效 | 計算那條路徑**完全未修改**（`IndicatorCalculationRequestDto` 型別上就沒有刻度欄位） | `Tpanel`「選單在，且說明它目前還沒生效」＋變更範圍 | ✅ |

### US-09 失敗不會改變畫面上的東西

| ID | Clause | Oracle | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AC-37 | 儲存被拒絕 | 編輯區內容一字不動；原因另外呈現 | `lib.writeStrategy`（失敗分支不寫回任何畫面狀態） | `Tpanel` 三支失敗案例皆斷言編輯區內容 | ✅ |
| AC-38 | 說得出是哪一件事不成立 | 說明是名稱沒填／名稱重複／找不到那一支／內容不合規則，而非只說「操作失敗」 | 三個哨兵錯誤 + `nameDlg` 的欄位錯誤 | `TnameDlg`、`Tpanel`（衝突／找不到／連不上各一） | ✅ |

---

## Business Rules（PRD Section 4）

| ID | Rule | Implementation | Test | Status |
| :--- | :--- | :--- | :--- | :--- |
| BR-01 | 一支策略記四樣東西加一個名字，**不記交易標的** | `StrategyContentDto` | `Tpanel` AC-02 | ✅ |
| BR-02 | 挑一支就全部帶入 | `lib.loadStrategy` | `Tpanel` AC-01 | ✅ |
| BR-03 | 覆蓋前必問 | `lib.selectStrategy` → `draft` | `Tpanel` AC-05/09、`Tdraft` 全組 | ✅ |
| BR-04 | 儲存只有一顆按鈕，行為隨狀態走 | `lib.saveStrategy` | `Tpanel` AC-10/11 | ✅ |
| BR-05 | 另存只問名稱 | `nameDlg` | `TnameDlg` AC-19 | ✅ |
| BR-06 | 存完整算式，帶回畫面時拿掉外框；認不出就原樣交還 | `wDom.script`、`script.disassemble` | `Tscript`、`Tent` | ✅ |
| BR-07 | 刪除要確認、且不動編輯區 | `lib.askToDelete`、`lib.confirmDelete` | `Tpanel` AC-24/27 | ✅ |
| BR-08 | 失敗不改畫面 | `lib`（所有失敗分支） | `Tpanel` AC-37 | ✅ |
| BR-09 | 說得出是哪一件事 | 三個哨兵錯誤 | `Tpanel` AC-38 | ✅ |
| BR-10 | **名稱長度不在畫面上檢查** | `wDom`（只擋空白） | `Twrite`「名稱長度不在畫面上檢查——那是後端的規則」 | ✅ |
| BR-11 | 彙總刻度只記錄、不生效，畫面須明說 | `panel`（選單旁的說明） | `Tpanel` AC-36 | ✅ |

**Edge cases（Section 4）**

| Edge case | Test | Status |
| :--- | :--- | :--- |
| 載入後一個字都沒改就再挑另一支：不問 | `Tpanel` AC-08 | ✅ |
| 沒有使用中的策略但編輯區已寫了東西：仍要問 | `Tpanel` AC-09 | ✅ |
| 另存成功之後使用中的立刻換成新的那一支 | `Tpanel` AC-18 | ✅ |
| 使用中的那一支在別處被刪掉之後才按儲存 | `Tpanel` AC-15 | ✅ |
| 打開清單時連不上後端：不呈現空清單 | `Tpanel`、`TlibDlg` AC-23 | ✅ |
| 改掉又改回來算沒改 | `Tdraft`「改掉又改回來算沒改」 | ✅ |

---

## Non-Functional（PRD Section 6）

| ID | Requirement | Evidence | Status |
| :--- | :--- | :--- | :--- |
| NFR-01 | 清單一次全取、不分頁、不快取；載入一支不觸發任何計算 | `svc.listStrategies`（單次呼叫）；`lib.loadStrategy` 不碰計算 | ✅ |
| NFR-02 | 算式在畫面上只被當成文字，不執行不解讀 | `script.disassemble` 只做字串處理；無任何求值 | ✅ |
| NFR-03 | 不挑任何策略時，這一頁的用法與切片之前一致 | 既有的 `IndicatorCalculationPanel.spec.ts` 全數通過（僅多傳一個 prop） | ✅ |

---

## Orphans

| Behavior | Clause? | 判定 |
| :--- | :--- | :--- |
| `AppModal` 支援 Esc 關閉與點擊遮罩關閉 | PRD 未寫成 scenario | **非違規**：對話框的基本禮貌，屬 PRD §5「以覆蓋在畫面上的方式呈現」的實作面延伸。已由 `AppModal.spec.ts` 覆蓋 |
| 儲存進行中時按鈕停用 | PRD §5「載入狀態：對應的操作不可重複觸發」 | **有對應條款**，非孤兒。已由 `TnameDlg`「儲存中時不讓再按一次」覆蓋 |
| `StrategyLibraryDialog` 標出「使用中」 | PRD 未明寫 | **非違規**：與 §5「目前用的是哪一支，畫面上要看得出來」一致。已由 `TlibDlg` 覆蓋 |
| `picker` 的「未使用任何策略」選項 | PRD 未明寫 | **非違規**：沒有使用中策略時選單需要一個可顯示的狀態。已由 `Tpicker` 覆蓋 |

**Out of Scope 檢查**：PRD 列出的 7 項全部確認**未被實作**——
沒有「一鍵執行這支策略」、彙總刻度未作用在計算上、無版本歷史／回上一版／還原、
無分類標籤搜尋分頁我的最愛、畫面不檢查算式、策略不記交易標的、無匯入匯出共用。
**無 scope creep。**

---

## 稽核後的補強

初次稽核判為 5 條 🟡（程式碼做對了，但沒有測試釘住那條承諾）。
以下五條已補上，每一條都反向驗證過（破壞行為 → 該測試轉紅 → 還原）：

| ID | 原判定 | 缺什麼 | 補強 | 反向驗證 |
| :--- | :--- | :--- | :--- | :--- |
| AC-05 | 🟡 partial | 面板層只測過「還沒載入過任何策略」那一半；US-02 真正的主線是「已經載入一支又改過它」 | 新增面板測試 | 覆蓋前不問 → 紅 |
| AC-17 | 🟡 partial | 只測了「另存會建立新的一支」，沒測「原本那一支不受影響」 | 新增面板測試，斷言走建立而非改寫 | — |
| AC-26 | 🟡 partial | 確認刪除後沒斷言「那一支從清單消失」 | 新增面板測試（清單前後不同） | 刪完不重新取清單 → 紅 |
| AC-28 | 🟡 partial | 完全沒測 | 新增面板測試 | 刪別的也把使用中的解掉 → 紅 |
| AC-29 | 🟡 partial | 只在 application 層測過，面板層沒測 | 新增面板測試 | 刪除失敗卻不說 → 紅 |

> AC-28 第一次補的測試**存活了** mutation——它斷言了編輯區內容，卻沒斷言「使用中」這個關聯還在，
> 而那正是這一條真正要保護的東西。補上對選單值的斷言後才被殺掉。

---

## Verdict

**38 / 38 條符合（100%）。0 violation、0 gap、0 mis-asserted、0 orphan 違規。**
