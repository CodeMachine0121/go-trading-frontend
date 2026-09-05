# go-trading-frontend

[go-trading](../go-trading) 交易服務後端 REST API 的前端介面。
後端提供 K 線（KCandle）的讀寫與自訂指標計算，本專案是它的操作介面——
後端每一條路由都能從畫面操作，不必再開 Postman。

## 畫面

| 路徑 | 做什麼 | 重點 |
| :--- | :--- | :--- |
| `/` | **連線狀態** | 後端是否可用；連不上時明確告知而非留白。同一次檢查的結果也是側欄底下那顆燈，走到任何畫面都亮著 |
| `/k-candles` | **K 線瀏覽與維護** | 指定標的與區間查詢，結果**由新到舊**列出並標示漲跌；每一列可編輯，另可新增與刪除（刪除需二次確認），任何一次成功的維護都會自動重查 |
| `/k-candles/chart` | **K 線圖表** | 同一批 K 線改用圖呈現。**拉遠拉近就是在選要看多長**，每根涵蓋多久跟著自動換（五分鐘／十五分鐘／一小時／四小時／一天，挑最細的且畫面上不超過 400 根的那一種）；快捷區間一天到一年一鍵切換，畫法可在蠟燭與曲線之間切換。取資料時兩側各多取半段，因此小幅拖動不重新取。**「看什麼」那塊控制項收得起來**，收起來的高度全部歸圖；套在圖上的每一支策略各有一顆眼睛，**按一下把它的線收起來但不拿掉它**（照樣跟著重算、顏色照樣佔著，再按一下就是同一條線） |
| `/chat` | **行情助手** | 用日常講話的方式問行情，助手自己去查交易標的、K 線、指標與策略再用一段話回答。左邊是對話清單、右邊是對話串；**任何畫面都能從那顆圓形的機器人鍵叫出同一段對話的抽屜**（那顆鍵可以拖到你要的位置），抽屜標頭的展開再帶回這一頁 |
| `/indicator-calculations` | **指標計算** | **只寫算式內容**——套件宣告、匯入與 `Calculate` 進入點由畫面依「指標值種類」備妥並唯讀顯示在上下方；內容區有語法著色、自動縮排與常用片段。指標值種類四選一（一個數字／一串數字／一個是非／一串是非），結果依種類呈現：一串逐個列出、是非顯示「是」／「否」；附一鍵帶入該種類的範例內容 |

四種狀態（載入中／查無資料／被拒絕／連不上）與四類失敗（欄位填錯、請求的問題、
後端出錯、連不上）在每個畫面上的呈現方式一致，使用者一眼知道下一步該做什麼。

**交易標的一律從清單裡挑，不手打**：三個要讀行情的畫面（K 線瀏覽、K 線圖表、指標計算）
共用同一個 `SymbolField`，選項來自後端 `GET /trading-symbols`——那是它**已登錄的**標的
（後端 `make migrate` 時登錄的 BTCUSDT、ETHUSDT）加上**實際有 K 線的**，
所以後端剛建好資料庫、一根 K 線都還沒抓的時候，選單就已經有東西可挑。
清單是空的或取不到時，欄位會說明原因並保留目前那一檔，不會變成一個空白的選單。
**新增／修改 K 線的表單維持手打**：那正是新的交易標的誕生的地方。

### 介面是一台終端機，不是一份文件

版面語言取自實際在用的交易終端機（Kraken、OKX、Coinbase）與 Fey 那類收斂的深色產品介面，
算式那一頁另外參考了 Exa、Adaline 這類「編輯區 + 執行 + 輸出」的開發者工作台：

- **左邊一條固定的側欄**放四個去處與品牌，**底下釘著後端那顆燈**——後端可用是每一個功能的前提，
  要進到某一頁才問得到的話，使用者會先怪自己的查詢條件。**側欄收得起來**，收起來時縮成一條只剩
  圖示的窄邊（名字仍在 DOM 裡給讀螢幕的人，停在上面則以提示讀出），
  收起來與否跨畫面共用——走到下一頁不會自己彈回來。
- **頂上一條窄帶**只說「我在哪一個畫面」（標題與副標同一行）並收著時區選單。
- **其餘整片都是工作區**，填滿視窗、沒有置中的最大寬度。**會捲的是工作區與各個面板自己**，
  不是整頁——表格與圖在自己的框裡捲，標題列與側欄永遠在原位。
- **每一個區域都是一塊面板**（`AppPanel`）：一條有底色的窄標題列加一塊內容，
  標題小而暗，亮度全部留給裡面的資料。表格、圖與編輯器走 `flush`——它們自己就是一整塊，
  邊界就該是面板的邊界。控制項面板可以走 `collapsible`：整條標題列變成一顆鍵，
  按一下把內容收掉只留那條窄帶（**內容整塊不畫，不是壓成零高**，否則鍵盤焦點會掉進去），
  讓出來的高度由旁邊那張圖吃掉。
- **密度**：欄位名、表頭與單位共用同一種小而暗的大寫標籤（`dense-label`），
  價量與時間共用同一種等寬定寬數字（`numeric`），所以一整欄數字上下對齊著讀。

**只走暗色一種主題**。程式碼區塊仍以編輯器的 One Dark 為錨（它要看起來就是一份檔案），
其餘介面的底色壓到接近全黑，讓面板不必畫陰影就浮得起來；邊框收成髮絲線，
層次靠明度差表達。漲跌那一對顏色比其餘語氣更飽和——一整欄數字裡要能不讀數值就先看出方向。
所有顏色一律是 `app/assets/styles/abstracts/_tokens.scss` 裡的 token，
元件內不得出現任何色碼（stylelint 會擋）。

### 助手在兩個地方，接的是同一段對話

助手同時是一整頁（`/chat`）與一個任何畫面都叫得出來的抽屜。它們**不是兩個功能**，
是同一段對話的兩種密度：

- **整頁**給「專心問一串」用：左邊對話清單、右邊對話串，寬度全開。
- **抽屜**給「看著圖順手問一句」用：右側浮在畫面上的一塊圓角卡片，其餘部分照樣看得到。
  **抓左緣那條邊可以拉寬度**（往左變寬），拉成多寬記在這台裝置上。
  最窄 320（再窄它就不能用）、最寬 720（它是疊上來的東西，不是第二個頁面），
  視窗變窄時跟著收——上次在寬螢幕拉到 700 的人，這次開窄視窗不該看到一塊比視窗還寬的面板。
  **開新對話與回到舊對話都在抽屜裡辦得到**：開新對話在標頭一直看得到，
  歷史是標頭上的一顆開關、按下蓋上來一層（不是擠在旁邊的第二欄），挑完就收起來。
  打開歷史才去讀清單——沒人翻的時候那是一次白打的請求。
  標頭的展開則帶著同一段對話跳到整頁。
- **換畫面抽屜就收起來**。它是隨手問一句的地方，不是常駐側欄。

「目前這段對話」是一份**跨畫面共用的畫面狀態**（`useAssistantConversation`，
與側欄那顆燈同一種做法）。這條線一畫下去，一整類 bug 就不可能發生：
兩邊不會各記一份、切走再回來不會掉、**等待中換畫面不會重送**。
對話串與輸入區因此是同一組元件，兩個地方共用。

版面語言取自資料工具裡 AI 對話的既有慣例（Basedash、Amplitude、Customer.io 的
清單＋對話串；Fabric、HoneyBook 的抽屜＋展開；Perplexity、Coda 的用量讀數；
Claude 的額度警示塊；WRITER、Origin、Cohere 的建議提問；GoDaddy、Gorgias、
Relevance AI 的圓形浮動鍵；Base44、Hims、Substack 的圓泡泡與膠囊輸入框）。

### 這一塊是對話，不是儀表

操作台其餘部分的角**刻意收得很緊**——它是一台儀器。助手這一塊反過來：

- 泡泡、抽屜、輸入框與清單的列都用 `radius('xl')` 與 `radius('2xl')`
  （token 裡新增的那兩級，**只給對話介面用**）。
- 泡泡**貼著說話者那一側的角收緊**，那個缺口就是尾巴，指向講這句話的人。
  四個角一樣圓的話，泡泡會漂在半空中不知道是誰講的。
- 輸入區是**一整枚膠囊**，裡面是輸入框與一顆圓形的送出鍵；框只有那一枚。
- 回答那一側有一顆**圓形的機器人頭像**，因為回答通常長好幾倍：有一個固定的起點，
  眼睛才知道每一則從哪裡開始。等待中的佔位長得跟回答一樣，所以回答回來時是**換內容**，
  不是換一個形狀。

理由不是好看：方方正正的框讓人以為自己在填表單，而這裡是在講話。

### 那顆鍵可以拖

叫出助手的是一顆**圓形的機器人鍵**。它可以被拖到畫面上任何地方，
因為它會遮住東西——而遮住什麼取決於使用者正在看哪一張圖，那是只有他知道的事。

- 它是 **64 像素**的圓鍵，大小是 TypeScript 裡一個數字、元件照著畫——
  夾回範圍的算式要用同一個數字，兩邊各寫一份就會在靠邊時差一截。
- 位置**記在這台裝置上**（走 `IAssistantTriggerPositionPreferenceProxy`，
  與時區、線色那幾份記憶同一類），下次打開還在那裡。
- **永遠夾回看得見的範圍**：拖到視窗外、或上次擺在大螢幕這次開小視窗，
  都會被拉回來。它是叫出助手的唯一入口，點不到等於功能消失。
- **分得出拖曳與按一下**（移動四像素以上才算拖）。沒有這個門檻的話，
  按下時手抖的那一兩個像素會把每一次按都變成拖曳，那顆鍵就再也按不開了。
- 拖曳中的 pointer 事件掛在 window 上，因為手一快就會離開那顆鍵。
- **抽屜不跟著跑**：一塊 420 像素的面板跟著一顆鍵到處走，會在半數位置把自己推出視窗。
  會動的是鍵，抽屜永遠靠右。

**回答裡的程式碼與算式編輯器長得一樣。** 助手用圍欄圈起來的程式碼，
用的是操作台**同一個**程式碼區塊元件（`AppCodeEditor`）的唯讀樣子：
同一套著色、同一條行號欄、同一組字體行高。使用者會把那段東西貼進算式編輯器，
兩邊長得一樣他才認得出那是同一種東西；而後端說「第 12 行出錯」時，畫面上就是那一行。

**唯讀不是樣式上的收斂**，是那個元件的一種樣子：它拿掉整組編輯用的擴充，
並讓編輯器自己回報不可編輯——**一則已經說出口的訊息不該能被改**。
圍欄上宣告的語言標在右上角，它只用來標給人看：這個程式碼區塊只認得 Go，
標註是那份著色的誠實對照。助手排的**表格**那幾行則照原樣當文字，不給行號——
那不是程式碼，給了行號只會讓人以為可以貼去執行。

**助手給的東西複製得走。** 程式碼區塊右上角一顆、每一則回答底下一顆——
一段算式是要貼進算式編輯器的，而在一個唯讀的圓角小卡片裡拖曳選取特別難選。
程式碼那顆只複製那一段**本身**（圍欄那三個反引號不跟著進剪貼簿），
回答底下那顆複製**原本那段文字**（拆好的塊是給眼睛看的，剪貼簿要的是原文）。
自己問的那句話沒有複製鍵：使用者剛打完，他手上本來就有。
**每一顆各自記自己的狀態**（共用一份的話，按了某一顆畫面上每一顆都會同時打勾），
那個勾兩秒後自己退回去；瀏覽器拒絕時**不靜靜失敗**，那顆鍵當場把理由說出來——
不然使用者會帶著一個空的剪貼簿去貼上，然後以為是貼上的地方壞了。
剪貼簿是外部資源，所以它走的是完整的一條路（`IClipboardProxy` → service → application），
而不是讓元件直接碰 `navigator.clipboard`。

**回答的結構是自己拆出來的，不引 markdown 套件。**
`MessageContentDomain` 把一則訊息拆成段落／小標／條列／編號／照原樣那五種塊，
再把每一行拆成普通／強調／等寬三種片段；畫面照著渲染，**每一段都以文字繩定輸出**。
這同時解決兩件事：帶數字的回答讀得懂（查過的設計慣例裡，這種回答幾乎都靠小標與條列
在組織，純文字會讓數字沉在一面牆裡），而且**助手回的任何內容都不可能被當成指令執行**。
代價是認得的結構有限——認不出來的一律當一段白話，這是刻意的。

**等待最長兩分鐘**（後端的上限），因此送出後提問先上對話串，下面接一個佔位，
輸入框鎖住；超過二十秒佔位再補一句說明。少了「鎖住」這一道，
使用者在那兩分鐘裡多按一次 Enter 就是多花一次錢。

**四種拒絕四種說法**，因為使用者要做的事不同：今日額度用盡（等到重置，訊息帶著重置時刻）、
助手沒回應（稍後再試）、那一段對話不在了（退回新對話）、連不上後端（去啟動它）。
警示塊長在**回答該出現的位置**而不是畫面頂端——額度用盡是「這一句沒送成」，
不是「整個畫面壞了」；那一句同時回到輸入框，並附一顆重送它的鍵。

**「查了幾次／動用多少份量」只出現在剛收到的那一則。** 後端讀一段對話時不回那組數字，
所以重新載入之後附註就沒有了。與其為了前後對稱而全部不顯示，
不如在拿得到的時候誠實顯示——這是取捨，不是 bug。

### 算式編輯區

指標計算的算式區是一整塊「看起來就是一份 Go 檔案」的區塊：

- **唯讀外框與可編輯內容是同一個原子的兩種樣子**（`AppCodeEditor` 的 `readonly`），
  因此共用同一套語法著色、同一條行號欄與同一組字體行高。
- **行號連著整份檔案數下去**：外框從第一行開始，內容接在後面，收尾的括號在最後——
  後端說「第 12 行出錯」時，畫面上就是那一行。
- **內容整段縮排一層**，因為它住在進入點裡面。
- 區塊跟著工作區的高度長（窄螢幕上仍留一份夠大的底線），多出來的空白落在檔尾
  （不是塞進可編輯的那一段，否則收尾括號會被推離程式碼），
  **點那片空白就接著最後一行繼續打字**。

## 開發流程（SDD）

每個功能切片都走 **clarify → prd → architecture → implement (code-first) → contract**，
文件放在 `.sdd/{日期}-{切片名}/`：

| 切片 | 文件 |
| :--- | :--- |
| K 線瀏覽 | [`.sdd/2026-08-30-k-candle-browsing/`](.sdd/2026-08-30-k-candle-browsing/) |
| K 線維護 | [`.sdd/2026-08-30-k-candle-management/`](.sdd/2026-08-30-k-candle-management/) |
| 指標計算 | [`.sdd/2026-08-30-indicator-calculation/`](.sdd/2026-08-30-indicator-calculation/) |
| 只寫算式的內容 | [`.sdd/2026-09-02-strategy-script-authoring/`](.sdd/2026-09-02-strategy-script-authoring/) |
| K 線圖表 | [`.sdd/2026-09-02-k-candle-chart-view/`](.sdd/2026-09-02-k-candle-chart-view/) |
| 交易標的選單 | [`.sdd/2026-09-02-trading-symbol-picker/`](.sdd/2026-09-02-trading-symbol-picker/) |
| 顯示時區 | [`.sdd/2026-09-03-display-time-zone/`](.sdd/2026-09-03-display-time-zone/) |
| 查到送出當下 | [`.sdd/2026-09-03-k-candle-search-until-now/`](.sdd/2026-09-03-k-candle-search-until-now/) |
| 策略庫 | [`.sdd/2026-09-03-strategy-library/`](.sdd/2026-09-03-strategy-library/) |
| 開一份新的空白策略 | [`.sdd/2026-09-03-blank-strategy-draft/`](.sdd/2026-09-03-blank-strategy-draft/) |
| 算式收到的 K 線有哪些欄位 | [`.sdd/2026-09-03-k-candle-field-reference/`](.sdd/2026-09-03-k-candle-field-reference/) |

共用的詞彙與專案前提在 [`.sdd/UL-MAP.md`](.sdd/UL-MAP.md) 與 [`.sdd/PROJECT.md`](.sdd/PROJECT.md)。
每個切片的 `CONTRACT.md` 是驗收情境與程式碼的符合性稽核矩陣——它記錄的是
「測試有沒有斷言規格要求的結果」與「程式碼有沒有真的產出那個結果」，兩者都成立才算數。

## Tech Stack

| 層面 | 選型 |
| :--- | :--- |
| 框架 | **Nuxt 3**（3.21.x）+ Vue 3 |
| 語言 | **TypeScript**（`strict`） |
| 數值處理 | **decimal.js**（金額 / 價格 / 停損，禁用 `number`） |
| 樣式 | **SCSS**（`sass-embedded`）＋ CSS custom property token，中央控管於 `app/assets/styles/` |
| 元件設計 | **Atomic Design**（atoms / molecules / organisms / templates） |
| 程式碼編輯 | **CodeMirror 6**（`@codemirror/lang-go` 語法／縮排／片段、`@codemirror/theme-one-dark` 配色），掛載後才動態載入，不擋首屏 |
| 打包 | **Vite**（Nuxt 內建） |
| 單元測試 | **Vitest** + `@vue/test-utils` + `happy-dom` |
| Lint | **ESLint 10**（`@nuxt/eslint` + `typescript-eslint`，含 stylistic 排版規則） |
| 樣式 Lint | **Stylelint 17**（`stylelint-config-standard-scss` + `stylelint-config-recommended-vue`） |
| 型別檢查 | `vue-tsc`（`bun run typecheck`） |
| Git hooks | **Husky** + lint-staged |
| 套件管理 / script runner | **Bun**（1.3.x） |

> TSLint 已於 2019 年停止維護並併入 typescript-eslint，因此 TypeScript 的 lint 由 ESLint 的
> `typescript-eslint` 規則集負責（已隨 `@nuxt/eslint` 啟用），不另外安裝 TSLint。

## 架構

分層與命名規範是本專案的硬性要求，動工前先讀 [CLAUDE.md](CLAUDE.md) 與 [.claude/rules/](.claude/rules/)。

```
.vue 元件  ───▶  Application  ───▶  Domain  ◀───  Infrastructure
(Controller)     (use cases)       (核心)         (Proxy 實作)
```

依賴方向一律指向 Domain。前端沒有資料庫，**沒有 Repository**；對外資料一律走 **Proxy**。

```
app/
├── assets/styles/          SCSS 中央層：token / mixin / 全域入口
├── pages/                  Controller：路由層 .vue
├── components/             Controller：畫面元件 .vue（原子化設計四層）
│   ├── atoms/              不可再拆的通用 UI（AppButton、AppPanel…），不認識領域概念
│   ├── molecules/          原子組成的功能單位（BackendHealthCard…）
│   ├── organisms/          畫面上可獨立存在的整塊區域
│   └── templates/          只有版面骨架與插槽
├── application/            XxxApplication（純 TS，不認識 Vue）
├── domain/
│   ├── models/
│   │   ├── entities/       乾淨 Data Model（只有欄位）
│   │   ├── domains/        Domain Model（業務行為所在地）
│   │   ├── dto/            domain 對外的唯一形狀
│   │   └── vo/             value object
│   ├── service/            Domain Service
│   ├── errors/             哨兵錯誤
│   └── interface/          I{能力}Proxy 介面，一介面一檔
├── infrastructure/proxy/   Proxy 實作（唯一能用 $fetch 的地方）
├── plugins/dependencies.ts 組裝根：手動 DI
└── utilities/              不得已的純技術性工具（預設應為空）

tests/                      鏡射 app/ 的目錄結構，檔名 {受測檔名}.spec.ts
```

`k-candle` 切片是這條呼叫鏈的完整範例，可照著它長新功能：
`KCandleProxy` → `KCandleService` → `KCandleApplication` → `KCandleSearchPanel` → `pages/k-candles/index.vue`。

K 線圖表走同一條鏈，但中間多一個判斷點：`KCandleChartViewportDomain` 收下
「正在看哪一段 + 手上有什麼」，一口氣算出每根該多粗、要不要重新取、要取哪一段。
**不必重新取時 `KCandleChartApplication.loadKCandleChart` 回 `null`**——
這是圖表不會自己轉個不停的原因：餵完資料之後圖會再說一次「正在看的區間變了」，
若那時又回傳一批資料，畫面就會重畫、圖又再說一次，永遠停不下來。

**頁面只做接線**：從組裝根取得 Application 往下傳，互動狀態一律住在 organism。
這讓每條驗收情境都能用元件測試涵蓋，不必啟動 Nuxt runtime
（`@nuxt/test-utils` 的 runtime 在本專案的版本組合下無法初始化）。

**業務規則住在 domain**：查詢條件、K 線寫入、指標請求都是「建構即驗證」的 domain model——
不合法的東西在系統裡根本不存在，proxy 拿到的必定送得出去。
錯誤帶著欄位名，畫面因此不必比對訊息內容來決定訊息標在哪一欄。

**算式的文字只有一個產生地**：外框、四種指標值種類的範例內容、以及「內容如何組成一整段算式」
全部住在 `IndicatorScriptDomain`。後端哪天改了進入點的形式，要改的就只有那一個檔案，
也不可能有第二個地方組出不一樣的外框。

### 分層由 ESLint 把關

[eslint.config.mjs](eslint.config.mjs) 把架構規範轉成 lint 規則，違規會直接紅：

- Domain 層 import 外層或 Vue / Nuxt → 擋
- Application 層 import infrastructure 或 Vue → 擋
- `.vue` 元件 import entity / domain model / service / proxy → 擋
- `$fetch` / `useFetch` / `localStorage` 出現在 Proxy 以外的地方 → 擋
- `any` / `@ts-ignore` → 擋
- `.vue` 直接放在 `app/components/` 底下（沒進 atoms/molecules/…）→ 擋
- atom import domain / application、下層元件 import 上層元件 → 擋
- `<style>` 沒有 `lang="scss"` / 沒有 `scoped` → 擋

Stylelint（[stylelint.config.mjs](stylelint.config.mjs)）則把樣式的中央控管轉成規則：

- 元件內寫色碼、具名顏色、`rgb()` → 擋（一律用 `color('token')`）
- class 不是 BEM → 擋
- `!important` → 擋
- 白名單只有 `app/assets/styles/**`——字面值只該住在 token 定義裡

## 樣式

樣式規範見 [.claude/rules/component-design.md](.claude/rules/component-design.md)。重點：

```
app/assets/styles/
├── abstracts/            只有變數 / 函式 / mixin，不產生任何 CSS（由 Vite 自動注入每個 SCSS 檔）
│   ├── _tokens.scss      ★ 全站唯一寫字面值的地方
│   ├── _functions.scss   color() / spacing() / font-size() / radius() / shadow() …
│   ├── _breakpoints.scss respond-to() mixin
│   └── _mixins.scss      focus-ring / surface / dense-label / numeric 等共用片段
├── base/                 :root 的 CSS custom property、reset、排版底色調
└── main.scss             唯一的全域入口（nuxt.config.ts 的 `css`）
```

- 元件一律 `<style scoped lang="scss">`，且**不必自己 `@use` abstracts**——已由
  `nuxt.config.ts` 的 `vite.css.preprocessorOptions.scss.additionalData` 注入
  （`vitest.config.ts` 有等價設定，兩邊要一起改）。
- 值一律走 token 函式：`color('danger')`、`spacing('md')`；打錯 token 名字會讓建置直接失敗。
- 需要新的顏色 / 間距，先加進 `abstracts/_tokens.scss` 的 map，`base/_tokens.scss` 會自動展開成 CSS 變數。

## Commands

```bash
bun install           # 安裝依賴（會自動跑 nuxt prepare 與 husky install）
bun run dev           # 開發 server（預設 http://localhost:3000）
bun run build         # 產出 .output/
bun run preview       # 預覽 production build
bun run generate      # 靜態產出

bun run lint          # ESLint
bun run lint:fix      # ESLint 自動修
bun run lint:style    # Stylelint（.scss 與 .vue 的 <style>）
bun run lint:style:fix # Stylelint 自動修
bun run typecheck     # vue-tsc 型別檢查
bun run test          # Vitest 跑一次
bun run test:watch    # Vitest watch 模式
bun run test:coverage # 覆蓋率報告
bun run verify        # lint + lint:style + typecheck + test（等同 pre-push 的檢查）
```

> ⚠️ **一定要 `bun run test`，不要 `bun test`。** `bun test` 會跑 bun 內建的測試 runner
> 而不是 package.json 裡的 `test` script，我們的 Vitest 測試會整批被略過而看起來「沒事」。
> 其他 script 名稱沒有這個衝突，但統一都加 `run` 最安全。

Bun 只取代 pnpm 那一層（套件管理與 script runner）；**打包仍然是 Nuxt 內建的 Vite**，
測試仍然是 Vitest。依賴的 postinstall script 由 package.json 的 `trustedDependencies`
明確授權（`esbuild`、`unrs-resolver`），這是 bun 的安全預設。

### Dev server 有兩個「別讓它自己發現」的設定

`nuxt.config.ts` 裡有兩處設定看起來可以刪，其實是在補 dev server 的兩個啟動時序缺口。
兩者都只在**冷啟動**（剛 clone、`bun install` 之後、或 `nuxt build` 清掉 `.nuxt` 之後的
第一次 `bun run dev`）才現形，所以很容易被誤判成偶發雜訊而刪掉。

#### `$development.experimental.appManifest: false`

只在 dev 關掉 Nuxt 的 app manifest。開著的話 `#app-manifest` 這個 alias 會指向
`.nuxt/manifest/meta/{buildId}.json`，而那個檔案要等 nitro 建完才寫出來；dev 冷啟動時 Vite
會先 pre-transform nuxt 的 manifest composable，比 nitro 快一步就會噴：

```
ERROR  Pre-transform error: Failed to resolve import "#app-manifest" ... Does the file exist?
```

這是啟動時序的 race（`nuxt build` 清掉 `.nuxt` 之後的第一次 `bun run dev` 最容易踩到），
畫面其實還是正常的，但每次冷啟動都刷一排紅字。關掉之後 alias 改指向 node_modules 裡恆存在的
空模組，錯誤就結構上不會發生。

**這個 race 只發生在 dev，所以用 Nuxt 的 `$development` 圈住，不要寫成全域的
`experimental.appManifest: false`。** manifest 在正式環境是有用的，全域關掉等於為了一個
dev-only 的錯誤去降級 production：

| 全域關掉會少了什麼 | 影響 |
| :--- | :--- |
| `check-outdated-build.client` 這個 plugin 不再註冊 | 不會再定期輪詢 `builds/latest.json`，所以「部署了新版本，開著的頁籤自動重載」偵測不到 |
| 靜態產出的 `_payload.json` 不會再被載入 | `bun run generate` 之後，client 端換頁改成重新取資料，而不是讀預渲染好的 payload |

第二點是實測的：同一份 `bun run generate` 產出，manifest 開著時換頁會抓
`/k-candles/_payload.json` 並預抓另一頁的，全域關掉則一個都不抓。圈成 `$development` 之後
`build` 與 `generate` 都維持開啟，上面兩件事都不受影響——實測換頁照樣抓 payload。

#### `vite.optimizeDeps.include` 點名 CodeMirror

`AppCodeEditor` 掛載後才動態 `import()` 那七個 `@codemirror/*`（編輯器碰得到 `document`，
伺服器端沒有），所以 Vite 從進入點靜態掃不到它們。少了這份名單，dev 冷啟動後第一次打開
「指標計算」才會臨時發現這些套件、當場重新優化依賴，正在飛的那批 import 就拿到：

```
504 (Outdated Optimize Dep) .../deps/@codemirror_theme-one-dark.js
TypeError: Failed to fetch dynamically imported module
```

三個編輯器的 `onMounted` 會一起炸掉，畫面只剩三個空容器，**得手動重新載入才會好**。
在這裡先報名，dev server 啟動時就一次預打包完，那個缺口就不存在了。

> 兩件事的共通點：**新增任何「只在 `onMounted` 裡動態 import」的第三方套件時，記得同時加進
> 這份 `optimizeDeps.include`**，否則同一個 504 會在那個新頁面重演。

## Git Hooks

| Hook | 動作 |
| :--- | :--- |
| `pre-commit` | 對 staged 檔案跑 `eslint --fix` 與 `stylelint --fix`，再跑全專案 `bun run typecheck` |
| `pre-push` | `bun run lint` + `bun run lint:style` + `bun run typecheck` + `bun run test` |

緊急情況要跳過：`git commit --no-verify`（請盡量不要）。

## 環境變數

複製 [.env.example](.env.example) 成 `.env` 後調整：

| 變數 | 預設值 | 用途 |
| :--- | :--- | :--- |
| `NUXT_PUBLIC_BACKEND_BASE_URL` | `http://localhost:8080` | 後端 go-trading REST API base URL |

### 跨來源（CORS）

前端與後端是兩個 origin（開發時 `http://localhost:3000` 對 `http://localhost:8080`），
所以每一次呼叫都要後端點頭瀏覽器才讀得到回應。後端 go-trading 只對它的
`CORS_ALLOWED_ORIGINS`（預設 `http://localhost:3000`）名單內的來源回授權標頭。

因此這兩個值是一組的，要改就一起改：

| 這裡改了 | 後端要跟著改 |
| :--- | :--- |
| `nuxt.config.ts` 的 `devServer.port` | `CORS_ALLOWED_ORIGINS` |
| 部署到某個網域 | `CORS_ALLOWED_ORIGINS` 加上該網域 |

> 被 CORS 擋掉時，瀏覽器不會把後端的回應交給我們——`fetch` 拿到的東西跟「後端根本沒啟動」
> 一模一樣。因此畫面上的「連不上後端」同時涵蓋這兩種情況，錯誤文案兩個都提。
> 真正的原因看瀏覽器 console，那裡才會明說是 CORS。
