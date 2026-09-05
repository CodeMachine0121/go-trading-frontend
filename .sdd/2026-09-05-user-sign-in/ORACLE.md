# 登入畫面 — Oracle（預期結果，先於實作寫下）

每一列的「預期結果」都只從 `PRD.md` 的 AC 場景推導，**不參考任何實作**。
測試的每一個斷言值一律取自本表；若某個值只能靠跑實作才得知，就是本表不完整，回頭補或問。

## CredentialsDomain — 送出之前的把關（US-02）

`fieldErrors()` 回一個「每一格各自的錯誤」的形狀；`null` 代表那一格沒問題。

| # | 模式 / 電子郵件 / 密碼 | 預期結果 |
|---|---|---|
| C1 | `signIn` / `james@example.com` / `correct horse` | 兩格皆 `null`，`isSubmittable()` = true |
| C2 | `signIn` / `""` / `correct horse` | email 錯誤含「電子郵件」，password = `null`，不可送出 |
| C3 | `signIn` / `"   "` / `correct horse` | 同 C2——只有空白等同沒填 |
| C4 | `signIn` / `james@example.com` / `""` | password 錯誤含「密碼」，email = `null`，不可送出 |
| C5 | `signIn` / `""` / `""` | **兩格各自都有錯誤**——一次講完，不要讓人改一格再被念一次 |
| C6 | `signIn` / `james@example.com` / `1234567`（7 字元） | 兩格皆 `null`，**可以送出**——登入不套用長度規則 |
| C7 | `signIn` / `james@example.com` / 73 個 `a` | 兩格皆 `null`，**可以送出**——同上 |
| C8 | `register` / `james@example.com` / `12345678`（剛好 8 字元） | 兩格皆 `null`，可以送出 |
| C9 | `register` / `james@example.com` / `1234567`（7 字元） | password 錯誤含「8」，不可送出 |
| C10 | `register` / `james@example.com` / 72 個 `a`（72 位元組） | 兩格皆 `null`，可以送出 |
| C11 | `register` / `james@example.com` / 73 個 `a`（73 位元組） | password 錯誤含「72」，不可送出 |
| C12 | `register` / `james@example.com` / 24 個中文字（72 位元組） | 兩格皆 `null`，可以送出 |
| C13 | `register` / `james@example.com` / 25 個中文字（75 位元組） | password 錯誤含「72」，不可送出 |
| C17 | `register` / `james@example.com` / 5 個表情符號 | password 錯誤含「8」，不可送出——下限數的是**字元**，而表情符號在 JavaScript 裡佔兩個「長度」，數錯就會放行一組後端會退回來的密碼 |
| C14 | `register` / `not-an-email` / `correct horse` | 兩格皆 `null`，**可以送出**——格式交給後端判，不在這裡抄一份 |
| C15 | `signIn` / `  james@example.com  ` / `correct horse` | 可以送出；`toCredentialsDto()` 的 email **不含前後空白** |
| C16 | 任一模式 / 任意 / `"   "`（三個空白） | password 皆 `null`——**密碼不去空白**，空白是密碼的一部分（`register` 時再被長度規則擋下） |

## AccessTokenDomain — 這份憑證還算不算數（US-05）

現在固定為 `2026-09-05T08:00:00.000Z`。

| # | 到期時刻 | 預期結果 |
|---|---|---|
| A1 | `2026-09-06T08:00:00.000Z` | `isUsable()` = true |
| A2 | `2026-09-05T08:00:01.000Z` | `isUsable()` = true |
| A3 | `2026-09-05T08:00:00.000Z`（正好現在） | `isUsable()` = **false**——正好到期就是到期 |
| A4 | `2026-09-05T07:59:59.000Z` | `isUsable()` = false |

## UserSessionApplication.signIn — 登入（US-04、US-05）

真實 service 與 domain model，只 mock 兩個 proxy 介面。

| # | 情境 | 預期結果 |
|---|---|---|
| S1 | 帳密送得出去且後端接受 | `IUserProxy.signIn` 收到的 email 是**去前後空白後**的；憑證被 `writeAccessToken` 記住；接著以該憑證呼叫一次 `fetchSignedInUser`（登入只回憑證，識別碼得跟後端要，順帶當場證明這份憑證真的有效）；回覆目前登入者 |
| S2 | 後端回 `CredentialsRejectedError` | 原樣拋出；**`writeAccessToken` 一次都沒被呼叫** |
| S3 | 記不住憑證（記憶那一側什麼都沒做） | **登入仍然成功**——這一次操作得起來，只是下次打開要重登。「記不住時不拋」這個前提本身由 `AccessTokenStorageProxy` 的 G4 守著，不在這一層重測 |
| S4 | 後端回 `AccessTokenUnavailableError` | 原樣拋出；不記任何東西 |
| S5 | 送出前把關就不過（C9 那種） | **不打後端**，拋出帶著每一格錯誤的失敗 |

## UserSessionApplication.registerUser — 建立帳號（US-05）

| # | 情境 | 預期結果 |
|---|---|---|
| R1 | 合格輸入且後端接受 | `IUserProxy.registerUser` 被呼叫**一次**、`IUserProxy.signIn` 也被呼叫一次（建完直接就是登入狀態，後端的建立不發憑證）；憑證被記住；回覆目前登入者 |
| R2 | 後端回 `EmailAlreadyRegisteredError` | 原樣拋出；`signIn` 不被呼叫；不記任何東西 |
| R3 | 密碼 7 個字元 | **不打後端**，拋出帶著 password 錯誤的失敗 |

## UserSessionApplication.restoreSession — 還原登入狀態（US-05、US-06）

| # | 情境 | 預期結果 |
|---|---|---|
| T1 | 沒有記住任何憑證 | 回 `null`（沒有目前登入者）；**不打後端** |
| T2 | 記著的憑證已經過期 | 回 `null`；**不打後端**；`clearAccessToken` 被呼叫 |
| T3 | 記著有效憑證，後端認得 | 回目前登入者；`fetchSignedInUser` 收到的是那份憑證 |
| T4 | 記著有效憑證，後端回 `AuthenticationRequiredError` | 回 `null`；`clearAccessToken` 被呼叫——留著一份誰都不認得的憑證只會讓下次載入再白跑一趟 |
| T5 | 記著有效憑證，後端連不上 | **拋出** `BackendUnreachableError`；**`clearAccessToken` 不被呼叫**——後端沒開不代表這份憑證壞了 |

## UserSessionApplication.signOut — 登出（US-07）

| # | 情境 | 預期結果 |
|---|---|---|
| O1 | 已登入 | `clearAccessToken` 被呼叫；**後端一次都沒被碰到** |
| O2 | 清不掉（`clearAccessToken` 拋出） | 不拋給呼叫端——登出這個動作在畫面上一定要成功 |

## UserProxy — 後端錯誤的翻譯（US-04）

| # | 後端回應 | 預期結果 |
|---|---|---|
| P1 | `POST /users` 201 `{"id":7,"email":"james@example.com"}` | 回 `SignedInUser`：`id` = 7、`email` = `james@example.com` |
| P2 | `POST /users` 409 | 拋 `EmailAlreadyRegisteredError`，訊息是後端那一句 |
| P3 | `POST /users` 400 | 拋 `BackendRequestRejectedError`（不是上面那個） |
| P4 | `POST /sessions` 200 `{"accessToken":"a-token","expiresAt":"2026-09-06T08:00:00Z"}` | 回 `AccessToken`：`accessToken` = `a-token`、`expiresAt` 是 `Date`，等於該時刻 |
| P5 | `POST /sessions` 401 | 拋 `CredentialsRejectedError`，訊息 = 「電子郵件或密碼不正確」 |
| P6 | `POST /sessions` 503 | 拋 `AccessTokenUnavailableError` |
| P7 | `GET /users/me` 200 | 回 `SignedInUser`；請求帶著 `Authorization: Bearer <憑證>` |
| P8 | `GET /users/me` 401 | 拋 `AuthenticationRequiredError` |
| P9 | 後端沒啟動（連不上） | 拋 `BackendUnreachableError`（沿用既有翻譯，不被上面任何一條攔走） |

## AccessTokenStorageProxy — 瀏覽器儲存（US-05）

| # | 情境 | 預期結果 |
|---|---|---|
| G1 | 寫入後讀回 | 讀回同一份憑證與同一個到期時刻 |
| G2 | 什麼都沒寫過就讀 | 回 `null` |
| G3 | 讀到的內容壞掉（不是合法 JSON） | 回 `null`，**不拋**——壞掉的紀錄與沒有紀錄對使用者是同一件事 |
| G4 | 儲存整個不能用（存取即拋） | 讀回 `null`、寫入不拋、清除不拋 |
| G5 | 清除之後再讀 | 回 `null` |

## SignInPanel — 那張卡片（US-01、US-02、US-03、US-04）

| # | 情境 | 預期結果 |
|---|---|---|
| V1 | 初次顯示 | 標題是「登入」，主要動作那顆鍵寫著「登入」 |
| V2 | 按下切換 | 標題變成「建立帳號」，主要動作寫著「建立帳號」 |
| V3 | 填好兩格再切換模式 | 兩格內容**都還在** |
| V4 | 切換模式 | 發出 `modeChange`，好讓頁面清掉上一次的訊息。訊息本身是 prop（它從共用狀態來），所以「消失」是頁面接線的結果，元件負責的是說出「換了」 |
| V5 | 兩格都填好，按主要動作 | 對外送出一次，帶著兩格內容與目前模式 |
| V6 | `pending` 為真 | 主要動作那顆鍵 `disabled`；**兩格輸入不 `disabled`** |
| V7 | `pending` 為真時按主要動作 | **不送出** |
| V8 | 傳入 `errorMessage` | 卡片上出現該訊息 |
| V9 | 傳入 email 的欄位錯誤 | 該訊息出現在電子郵件那一格底下 |
| V10 | 傳入 password 的欄位錯誤 | 該訊息出現在密碼那一格底下 |
| V11 | 密碼那一格 | `type` 是 `password` |

## useUserSession — 那一份共用的答案（US-05、US-06、US-07）

| # | 情境 | 預期結果 |
|---|---|---|
| U1 | 送出成功，且先前記過「原本想去的那一頁」 | 換頁到那一頁 |
| U2 | 送出成功，先前沒記過任何地方 | 換頁到 `/` |
| U3 | 同一份狀態連續兩次成功送出 | 第二次去 `/`——目的地用過就忘記 |
| U4 | 送出失敗 | **完全不換頁**，原因留在 `errorMessage`／`fieldErrors` 上 |
| U5 | 登出 | 換頁到 `/login`，`currentUser` 清成 `null`，且記過的目的地也一併忘掉 |

> 「成功之後換頁」在 `submitCredentials` 裡面完成，不回傳成功與否讓呼叫端自己再換一次：
> 一個業務動作要呼叫端排兩次呼叫才完成，漏掉第二次的畫面會停在原地。

## signed-in.global.ts — 把關（US-06）

| # | 目的地 / 目前登入者 | 預期結果 |
|---|---|---|
| M1 | `/k-candles` / 沒有 | 導向 `/login`，並記下 `/k-candles` 是他本來要去的地方 |
| M2 | `/k-candles` / 有 | 放行 |
| M3 | `/login` / 有 | 導向 `/` |
| M4 | `/login` / 沒有 | 放行 |
| M5 | 伺服器端執行時 | **一律放行**——那裡碰不到瀏覽器儲存，判斷必然是「沒登入」 |
| M6 | 同一個分頁第二次換頁 | **不再打後端**——答案已經有了 |
