# Architecture — 等待開通的畫面

**Designs against:** `PRD.md`
**Status:** Draft

---

## 1. Design Goal

把關**只加一句話**，不加第二道門。

既有的 `signed-in.global.ts` 已經是全站唯一的把關，而且它已經在問
「現在是誰在用」。這個切片要的判斷，資料就在那個答案裡——所以它變成同一道門的
第三個分支，而不是一道新的門。兩道門會各自認定一次「該不該放行」，
而兩個認定總有一天會不一致，不一致的那一天沒有人看得出是哪一道放的行。

---

## 2. Change Scope

### 2.1 新增

| 檔案 | 型別 | 為什麼 |
| :--- | :--- | :--- |
| `app/domain/models/dto/account-activation-instruction-dto.ts` | `AccountActivationInstructionDto` | 寄去哪、主旨寫什麼。**class 不是 interface**——它是資料，而且要帶一個 `toMailtoHref()` |
| `app/pages/pending-approval.vue` | 頁面 | 等待開通那一頁。只做接線，與 `login.vue` 同一個形狀 |
| `app/components/organisms/AccountActivationPanel.vue` | 有機體 | 那一整張卡片。互動全部住在這裡 |

### 2.2 修改

| 檔案 | 改動 |
| :--- | :--- |
| `app/domain/models/entities/signed-in-user.ts` | 多兩個欄位：`isEnabled`、`activationInstruction`；`toDto()` 一併帶過去 |
| `app/domain/models/dto/signed-in-user-dto.ts` | 同上 |
| `app/infrastructure/proxy/user-proxy.ts` | wire 型別多兩個欄位；`toSignedInUser` 把指示收成 DTO |
| `app/composables/use-user-session.ts` | 新增 `PENDING_APPROVAL_PATH`、`awaitingActivation`、`activationInstruction`、`recheckActivation()` |
| `app/middleware/signed-in.global.ts` | 多一組分支：待開通一律導到那一頁；已開通打那一頁導回首頁 |

### 2.3 刻意不動

| 對象 | 為什麼 |
| :--- | :--- |
| `backend-api-proxy.ts` | **不為 403 加一種新錯誤。** 進得了操作台的人一定已經開通（門擋住了），而開通是單向的——進去之後不會再變回待開通。為一個到不了的狀態寫翻譯，就是寫一段永遠不會跑的程式 |
| 其他 22 個 proxy、每一個 application、每一個畫面 | 一個字都不必改。這正是把關集中在一道門的價值 |
| 登出、續用、憑證的每一條路 | 後端刻意讓它們對待開通的人照常運作，這一側因此什麼都不必知道 |

---

## 3. New Components

### 3.1 `AccountActivationInstructionDto`

```ts
export class AccountActivationInstructionDto {
  constructor(
    public readonly requestMailbox: string,
    public readonly subject: string,
  ) {}

  toMailtoHref(): string
}
```

- **class 而不是 interface**：它要帶建構與一個轉換，而 interface 兩樣都帶不了。
- `toMailtoHref()` 掛在**它自己**身上，因為那串網址讀的全是它自己的兩個欄位。
  寫在元件裡就是 Feature Envy——元件會為了組一串字而把這兩個欄位整個拆開。
- **主旨一個字都不改**，只做網址編碼。它是管理者辨認申請人的唯一依據。

### 3.2 `AccountActivationPanel.vue`

一張卡片，與 `SignInPanel.vue` 同一個外型與同一組 token。
互動：複製信箱、複製主旨（各自一顆，各自記自己的狀態——沿用 `useCopyText`）、
寄出申請（`mailto:`）、重新檢查、登出。

**主旨用等寬字、可換行、可整段選取**：它含有使用者自己的電子郵件，
截斷會讓他手動選取時漏掉尾巴。

### 3.3 `pending-approval.vue`

只做接線，不含任何規則，**不套操作台外框**——與 `login.vue` 完全同一個決定：
還沒進門的人不該看到一個點不動的操作台。

---

## 4. Modified Components

### 4.1 把關（`signed-in.global.ts`）

判斷順序，以及為什麼是這個順序：

```
1. 沒登入 且 不是往登入頁      → 去登入頁（記下他本來要去哪）
2. 沒登入 且 是往等待開通那一頁 → 去登入頁         ← 這一頁是給登入了的人看的
3. 待開通 且 不是往等待開通那一頁 → 去等待開通那一頁 ← 含登入頁，所以跳不掉
4. 已開通 且 是往等待開通那一頁 → 去首頁           ← 與「登入了就別再看登入頁」同一條道理
5. 已開通 且 是往登入頁        → 去首頁           （既有）
```

**第 3 條要排在「已登入就別看登入頁」之前**：不然一個待開通的人打開登入頁會被送到首頁，
而首頁又把他送回等待開通那一頁——多繞一趟，還在網址列閃一下。

路由比對沿用既有做法：比對的是**這條路由是哪一條**（`to.matched`），不是使用者打進網址列的那串字。

### 4.2 `useUserSession`

新增三樣，各有各的理由：

- `awaitingActivation` — 一個 computed：登入著、而且還沒開通。
  **它是 computed 而不是新的一份狀態**，因為答案完全由 `currentUser` 決定；
  另存一份就是兩個會不一致的真相。
- `activationInstruction` — 同理，從 `currentUser` 上讀出來。
- `recheckActivation()` — 把那一次「已經確認過了」忘掉，重新確認一次。
  它與 `ensureSessionRestored` 不同：後者**一個分頁只做一次**（那正是它的意義），
  而這裡要的恰好相反——**每按一次就真的再問一次**，因為放行發生在別的地方，
  這一側不會知道。

---

## 5. The Axis of Change

| 下一個需求 | 會改到哪 |
| :--- | :--- |
| **停權**（已開通 → 停權） | 後端換掉那個欄位的意義；這一側只要 `awaitingActivation` 換個算法，那一頁改幾個字 |
| **被放行時通知他** | 那一頁多一個訂閱；把關與資料形狀都不動 |
| **代寄那封信** | `toMailtoHref()` 的呼叫端換成一次請求；主旨仍然由同一個地方組 |

seam 是 `awaitingActivation` 這個問題。只要把關問的是它，
「什麼叫還不能用」換掉的時候，二十幾個畫面一個都不必動。

---

## 6. Traceability

| PRD 情境 | 由誰滿足 |
| :--- | :--- |
| 建立帳號後停在那一頁 | 既有的「建立完直接登入」＋把關第 3 條 |
| 首頁／任意網址被帶到那一頁 | 把關第 3 條 |
| 登入頁也帶回那一頁 | 把關第 3 條排在第 5 條之前 |
| 沒登入的人看不到那一頁 | 把關第 2 條 |
| 信箱與主旨原字顯示 | `AccountActivationPanel` 直接綁 DTO 的兩個欄位 |
| 主旨複製得走 | `useCopyText` + 主旨那一顆 |
| 一鍵開出填好的信 | `AccountActivationInstructionDto.toMailtoHref()` |
| 放行後按一下就進得去 | `recheckActivation()` + 把關第 4 條 |
| 還沒放行就留在原地 | `recheckActivation()` 之後仍待開通，把關第 3 條把他留下 |
| 已開通的人到不了那一頁 | 把關第 4 條 |
| 在那一頁登得出去 | 既有的 `signOut` |

---

## 7. Testing Plan

| 層 | 測什麼 |
| :--- | :--- |
| `AccountActivationInstructionDto` | `toMailtoHref()`：收件人與主旨都在、主旨經過編碼且**內容一字不差** |
| `SignedInUser` | `toDto()` 帶得過去兩個新欄位，已開通時指示是 `null` |
| `UserProxy` | wire 的兩個新欄位收得進來；沒有指示時是 `null` |
| `useUserSession` | `awaitingActivation` 的兩種答案；`recheckActivation()` 真的重問一次（不是回用上一次的答案） |
| 把關 | 五條分支各一個案例 |
| `AccountActivationPanel` | 兩段字顯示得出來、複製送出正確的字、`mailto:` 連結正確、三顆動作各發一次 |
