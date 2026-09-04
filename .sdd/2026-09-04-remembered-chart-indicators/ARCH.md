# 圖上擺著的那幾支指標要記得住 — Architecture Design

**PRD:** [`PRD.md`](PRD.md)（24 條驗收條件） · **Brief:** [`BRIEF.md`](BRIEF.md)
**UL:** [`../UL-MAP.md`](../UL-MAP.md)

---

## 1. Design Goal & Guiding Principle

圖表那一側已經有兩種記憶（線色、旋鈕習慣值），各自一個 proxy、各自一份鍵。
這個切片加的是**第三種**，而它與前兩種有一個關鍵差別：

> 前兩種記的是**一個問題的答案**（這條線什麼顏色／這個旋鈕調成幾），
> 第三種記的是**一份有順序的清單**，而清單裡的每一筆都要對回一支**現在還存在**的策略。

指導原則：**還原是一次對照，不是一次還原。**

留存下來的東西不是「圖上長什麼樣」，而是「使用者當時要求了什麼」。
策略可能被刪、被改名、被改宣告、變成畫不成線——**還原時真相在策略清單那一側**，
留存的內容只提供「他要哪幾支、各配什麼值」。把留存當成可以直接搬回畫面的快照，
是這個切片最容易犯而且**不會報錯**的錯：圖上會出現一筆使用者現在加不進來的東西。

---

## 2. 為什麼不能用既有的旋鈕記憶還原清單

既有的 `IStrategyParameterValuePreferenceProxy` 記的是
「**這支策略的這個旋鈕**上次被調成什麼」——鍵是 `(策略識別碼, 參數名稱)`。

用它還原清單會這樣壞掉：

| 留存著 | 用旋鈕記憶還原會得到 |
| :--- | :--- |
| 均線 20 期、均線 60 期 | 均線 **60** 期、均線 **60** 期——兩條一樣的線 |

而「同時看 20 與 60」正是上一個切片存在的理由。**這條路會安靜地取消上一個切片。**

所以清單的留存必須帶**每一筆各自的值**，與旋鈕記憶是兩份不同的東西：

| 記憶 | 鍵 | 回答的問題 | 誰在用 |
| :--- | :--- | :--- | :--- |
| 線色 | 線的鍵 | 這條線什麼顏色 | 每次計算完配色 |
| 旋鈕習慣值 | (策略, 參數名稱) | 我習慣把這支調成幾 | **挑一支新的**時帶起始值 |
| **已套用的清單**（本切片） | 單一鍵，整份清單 | 圖上擺著哪幾筆、各配什麼值 | **打開畫面時還原** |

三種都留著。刪掉旋鈕習慣值、改用清單去推，代價是：把一筆從圖上移除之後，
那支策略的習慣值跟著消失——而使用者只是想暫時把它拿下來。

---

## 3. 變更範圍

| # | 層 | 檔案 | 動作 |
| :-- | :--- | :--- | :--- |
| 1 | domain / vo | `models/vo/remembered-applied-indicator-vo.ts` | **新增** |
| 2 | domain / interface | `interface/i-applied-chart-indicator-preference-proxy.ts` | **新增** |
| 3 | infrastructure | `proxy/applied-chart-indicator-preference-proxy.ts` | **新增** |
| 4 | domain / domains | `models/domains/remembered-applied-indicators-domain.ts` | **新增** |
| 5 | domain / dto | `models/dto/applied-indicator-dto.ts` | 加 `toRememberedVo()` |
| 6 | domain / service | `service/chart-indicator-service.ts` | 吃第四個 proxy；加兩個用例方法 |
| 7 | application | `chart-indicator-application.ts` | 兩個轉呼叫 |
| 8 | controller | `composables/use-chart-indicators.ts` | 還原、每次改動寫下來、第一次擺好位置時補算 |
| 9 | controller | `components/organisms/KCandleChartPanel.vue` | 取到策略清單之後還原 |
| 10 | 組裝根 | `plugins/dependencies.ts` | 接上新 proxy |

**不動的**：`AppliedIndicatorParametersDomain`（它的身分是「旋鈕習慣值那一份」，見 §5）、
`ChartIndicatorDomain`、線色那一整條、計算那一整條、任何 `.vue` 以外的呈現。

---

## 4. 新增的三個角色

### 4.1 `RememberedAppliedIndicatorVo`（VO）

留存下來的**一筆**，離開 proxy 之後在 domain 裡的形狀。

```
strategyId:      number
parameterValues: ReadonlyMap<string, number>   // 名稱 → 值
```

**種類刻意不在裡面。** 種類是宣告說的，留存它只會讓一份過期的種類贏過宣告——
後端在「策略讀回來時參數的種類」上踩過同一個坑，這裡不重蹈。

**值用 `Map` 而不是第二個 VO**：還原時對它做的唯一一件事就是「按名稱查」，
而那正是 `Map` 的形狀。多一個只有兩個欄位的 VO 換不到任何東西。

### 4.2 `IAppliedChartIndicatorPreferenceProxy`（介面）

```
readAppliedChartIndicators(): RememberedAppliedIndicatorVo[]
writeAppliedChartIndicators(remembered: readonly RememberedAppliedIndicatorVo[]): void
```

**為什麼這一個交出整份清單，而旋鈕那一個堅持逐個名稱讀寫。**
那條規則要防的是「鍵怎麼組漏到外面去」。這裡整份清單就是**一個**答案、一把鍵——
交出它沒有漏出任何鍵的組法。反過來若逐筆讀寫，外面就得先知道有幾筆、
第幾筆放在哪把鍵上，那才是把鍵的組法漏出去。

命名沿用既有三個的 `Preference`：它記的同樣是「這台機器上的習慣」。

### 4.3 `RememberedAppliedIndicatorsDomain`（Domain Model）

**還原的規則全部住在這裡。** 建構子收留存的那幾筆與**現在的策略清單**，
`toAppliedIndicatorDtos(lastAppliedIndicatorId)` 交出可以直接進清單的那幾筆。

逐筆的判斷順序（順序有意義）：

```
1. 對得上一支現在的策略嗎？        找不到 → 跳過（策略被刪了）
2. 那支現在畫得成線嗎？            畫不成 → 跳過（可挑清單裡本來就挑不到）
3. 依「宣告」重建那幾格：
     每一格 = (宣告的名稱, 宣告的種類, 值)
       值 = 留存的值，前提是它對這個種類用得了
            否則 → 宣告的預設值
4. 給它一個「這一次套用」的序號（接在 lastAppliedIndicatorId 之後）
```

第 1、2 步是**同一個判斷**（「這一筆回得來嗎」），因此只寫在一個私有 helper 裡：
發號要先知道回得來的有哪幾筆，重建那幾格又要拿到那一支——兩處各判斷一次就會漂移。

第 3 步的「用得了」直接問既有的 `StrategyParameterDomain.validationMessage()`——
「回看根數必須是大於零的整數」這條規則只有一份，不在這裡重寫一次。

**為什麼序號由外面給。** 「這一次套用」的序號由 `useChartIndicators` 一處產生
（既有規則），還原只是接在它後面繼續數。讓這個 Domain Model 自己從 1 開始數，
會讓還原之後手動加入的那一筆撞號——**而撞號的後果是移除一筆時兩筆一起消失**。

**回不來的那幾筆不佔號。** 所以先濾掉它們，再依剩下的順序發號——
呼叫端只知道「回來了幾筆」，它接著要用的號就是 `lastAppliedIndicatorId + 回來的筆數 + 1`。
讓跳過的那一筆佔一個號，回來的那一筆就會拿到呼叫端接著要用的那個號，
落點與「自己從 1 開始數」完全相同：撞號，然後移除一筆時兩筆一起消失。
（實作時真的踩到了這一個，由元件層「跳過一筆之後再挑一支」那條測試抓出來。）

---

## 5. 為什麼不與 `AppliedIndicatorParametersDomain` 併成一個

兩者的第 3 步看起來很像：都是「走宣告，記憶有就用記憶的，沒有就用預設值」。
併成一個的誘因很明顯，但併不掉：

| | `AppliedIndicatorParametersDomain` | `RememberedAppliedIndicatorsDomain` |
| :--- | :--- | :--- |
| 它是什麼 | **旋鈕習慣值那一份記憶本身**——它持有 proxy，`remember()` 也在它身上 | 一次**對照**：留存的清單 × 現在的策略清單 |
| 值從哪來 | 它自己去問 proxy（逐個名稱） | 隨著留存的那一筆一起進來 |
| 處理的單位 | 一支策略的那幾格 | 一份**有順序的清單**，還要決定哪幾筆不回來 |

要併就得把 proxy 從前者的建構子裡拿掉、把 `remember()` 搬去別的地方，
換來的只是省下一段三行的對映——**把一個完整的領域物件拆成兩半，去換三行**。

代價記錄在案：那三行（走宣告、記憶優先、種類照宣告）在兩處各自成立，
因此**兩處都有自己的測試守著**。哪一天規則真的變了，兩份測試會同時紅——
這比一份被過度抽象、誰都看不懂它在服務誰的共用物件安全。

---

## 6. 兩件事的順序：行情與策略清單誰先回來

`onMounted` 裡兩件事各自進行，**誰先回來都可以**——這是既有的設計
（取不到策略清單不擋圖表）。但還原之後要「算一次」，而計算需要「算哪一段」，
那個東西只有行情回來之後才存在。

| 誰先回來 | 會發生什麼 | 怎麼處理 |
| :--- | :--- | :--- |
| 行情先 | 還原時「算哪一段」已經在了 | 每一筆立刻各算一次（與手動加入完全同一條路） |
| 策略清單先 | 還原時「算哪一段」還不存在，`calculateOne` 會安靜地回頭——**清單上有列、圖上永遠沒有線** | 第一次擺好位置時，若清單上已經有東西，就把它們算一次 |

**要不要算，在還原時就決定一次，不要邊算邊等。**
還原是「附加整份、然後逐筆 `await calculateOne`」，而**每一個 `await` 都是一個空檔**。
兩件事都在掛載時發出，續段常常落在同一次微任務排空裡——行情的續段若正好落在那個空檔，
補算會與還原的迴圈同時跑，**同一批被算兩遍**：後端指標負載加倍，
而且兩次都對著空的 `chartIndicators` 算 `drawnLinesExcept`，於是短暫配到同一個顏色。
兩次都畫得出線，圖上不會有任何異狀。

所以還原一進來就先看「算哪一段」在不在：不在就只把那幾筆放進清單、直接回頭，
計算完全交給第一次擺好位置那條路。

（這一個也是 PR review 抓出來的；以「行情延後 0–3 個微任務回來」四向參數化測試守著。）

第二種情況要動既有的一行判斷。目前是：

```
還沒有任何一支在別的區間下算過（wasNeverSet）→ 什麼都不做
```

那條判斷成立的前提是「清單此刻必然是空的」（清單不留存，所以第一次擺好位置時
上面不可能有東西）。留存讓這個前提消失了，所以改成：

```
第一次擺好位置：清單上有東西就算它們一次，而且不等停手
                （第一次擺好位置不是拖動，等 300 毫秒只是讓圖空著）
清單是空的     → 什麼都不做（與今天一模一樣）
```

**這是本切片唯一一處改動既有判斷的地方**，理由與上一個切片推翻
「同一支不重複套用」相同：規則沒有錯，是它的前提消失了。

---

## 7. 什麼時候寫下來

寫在**清單真的變成新的一份**的那三個地方，各一次：

| 地方 | 寫嗎 | 為什麼 |
| :--- | :--- | :--- |
| 加入一筆（`addToChart`） | 寫 | 它是清單的一部分了 |
| 移除一筆（`removeAppliedIndicator`） | 寫 | 不寫的話它明天會回來 |
| 改一筆的值，**值用得了** | 寫 | 那是他要的值 |
| 改一筆的值，**值用不了** | **不寫** | 畫面要顯示他剛打的東西（既有規則），但留存的必須是能用的那一份 |
| 還在調、還沒加入的那一筆 | 不寫 | 它從來沒上過圖 |
| 算失敗、正在算、換了顏色 | 不寫 | 清單本身沒變。顏色有自己的記憶 |

**刻意不用 `watch` 一次搞定。** 用 watcher 看 `appliedIndicators` 會連
「值填得用不了」那一次也寫下去——那一次清單的內容確實變了（畫面要顯示它），
只是那份內容不該被留存。分辨得出這件事的只有那三個呼叫點。

### 「不寫」不等於「寫不到」——要寫下去的那一份必須自己有個地方

「值用不了就不寫」只擋得住**那一次**。清單的下一次改動（移除、加入）寫的是**整份**，
而畫面上那一份仍然帶著使用者剛打的那個用不了的值——於是它照樣被寫下去，
下次打開時退回策略的預設值，**使用者自己調過的那個值就這樣消失了**，
而從頭到尾沒有任何地方報錯。

所以 `useChartIndicators` 另外記著 **每一筆最後一次「值用得了」的樣子**
（`lastUsableAppliedIndicators`，以序號為鍵），而**唯一的寫入點**寫的是：

```
成員與順序 ← 畫面上那一份（appliedIndicators）
每一筆的值 ← 它最後一次用得了的樣子（沒有就用畫面上的）
```

它是一張查詢表，**不是第二份清單**：要寫的那一份永遠由畫面上那一份推導，
所以成員與順序不會漂移。兩者只有在使用者正把一個用不了的值留在某一格裡時才不同。

（這一個是 PR review 抓出來的，實作時漏了。見 [`CONTRACT.md`](CONTRACT.md)。）

---

## 8. 呼叫鏈

```
打開畫面（KCandleChartPanel）
  └─ 取到策略清單之後
     └─ useChartIndicators.restoreAppliedIndicators(strategies)
        └─ ChartIndicatorApplication.restoreAppliedIndicators(strategies, lastId)
           └─ ChartIndicatorService
              ├─ IAppliedChartIndicatorPreferenceProxy.readAppliedChartIndicators()
              └─ new RememberedAppliedIndicatorsDomain(留存的, 策略清單)
                   .toAppliedIndicatorDtos(lastId)   ← 還原的規則全在這裡
        └─ 進清單，各自 calculateOne（算不了就等第一次擺好位置）

清單改動（加入／移除／改值且值用得了）
  └─ useChartIndicators → ChartIndicatorApplication.rememberAppliedIndicators(清單)
     └─ ChartIndicatorService
        └─ 每一筆 appliedIndicatorDto.toRememberedVo()   ← 轉換寫在來源身上
        └─ IAppliedChartIndicatorPreferenceProxy.writeAppliedChartIndicators(...)
```

`toRememberedVo()` 掛在 `AppliedIndicatorDto` 上而不是 VO 上：
**要從 A 變成 B，method 就寫在 A 身上**（`a.toB()`，不是 `B.fromA(a)`）。

---

## 9. 留存的形狀與讀壞掉的東西

單一鍵 `go-trading:chart-applied-indicators`，內容是一份 JSON 陣列：

```json
[
  { "strategyId": 7, "parameterValues": { "期數": 20 } },
  { "strategyId": 7, "parameterValues": { "期數": 60 } },
  { "strategyId": 9, "parameterValues": {} }
]
```

wire 形狀只住在 proxy 檔內，**每個欄位都宣告成 `unknown`**——
瀏覽器儲存裡的東西比後端回來的更不可信：另一個版本、另一個分頁、
甚至使用者自己都可能在那裡留下讀不出來的東西。所以型別上不先假設它是對的，
而是逐個欄位驗過才收：

| 讀到 | 處理 |
| :--- | :--- |
| 整份不是讀得出來的陣列（壞掉的 JSON、一個物件、一個字串） | 空的一份 |
| 存取本身就拋例外（無痕視窗、封鎖網站資料） | 空的一份 |
| 某一筆沒有 `strategyId`、或它不是整數 | 跳過那一筆 |
| 某一格的值不是有限的數字 | 跳過那一格（那一格之後會拿到宣告的預設值） |
| `parameterValues` 不是一份鍵值對 | 那一筆沒有任何留存的值（全部用預設值） |

寫不進去一律吞掉——沿用既有三個 proxy 的規則：記不住不影響這一次的操作。

---

## 10. 已知的取捨（不修，記錄在案）

**回不來的那幾筆會被下一次寫入永久抹掉。**

還原會濾掉「策略被刪」與「現在畫不成線」的那幾筆，而之後任何一次寫入寫的是**濾過的那一份**。
於是：留存著 [均線, RSI] → 使用者把 RSI 改成回傳是非（畫不成線）→ 打開圖表（RSI 被跳過，
留存還在）→ 隨便加一支 → 留存變成 [均線, 新的那支]，**RSI 那一筆再也回不來**，
即使他之後把策略改回去。

PRD 只說那一筆「不回來且不出聲」，永久抹掉比這句話更強，而且不是使用者任何一個動作瞄準的結果。

**不修的理由**：要保住它，留存就不再是「圖上擺著哪幾筆」，而是「圖上那幾筆 ＋ 幾個幽靈」——
順序怎麼算、重複怎麼算、幽靈什麼時候才真的死掉，全都要另立規則；
而那個幽靈是使用者**看不到也移除不了**的東西。以一個人自己用的側項目來說，
「策略改回去之後要再擺一次」這個代價比那套規則便宜得多。

真的要修的話，落點是把跳過的那幾筆留在留存裡並保持原位，
而不是在寫入時想辦法補回來。

---

## 11. 測試計畫

| 層 | 測什麼 | 檔案 |
| :--- | :--- | :--- |
| **Domain Model** | 還原的每一條規則：找不到策略、畫不成線、多／少／改名的旋鈕、用不了的值、順序、序號接續 | `tests/domain/models/domains/remembered-applied-indicators-domain.spec.ts` |
| **DTO** | `toRememberedVo()` 只帶名稱與值，不帶種類 | 併入既有 `tests/domain/models/dto/applied-indicator-dto.spec.ts` |
| **Domain Service** | 讀留存 → 對照 → 交出那幾筆；寫留存寫的是整份 | 併入既有 `tests/domain/service/chart-indicator-service.spec.ts` |
| **Proxy** | 讀壞掉的東西、存取拋例外、寫下來的形狀 | `tests/infrastructure/proxy/applied-chart-indicator-preference-proxy.spec.ts` |
| **元件** | 打開畫面時那幾筆回到清單並各算一次；兩種回來順序都要算到；改動時寫下來；值用不了不寫 | `tests/components/organisms/KCandleChartPanelRestore.spec.ts` |

元件測試刻意獨立一支而不塞進既有四支：既有那四支各自守著一個主題
（指標、參數、即時、最新一根），還原是第五個主題。
