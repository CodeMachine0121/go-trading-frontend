# 不必天天重登 — Oracle（預期結果，先於實作寫下）

固定值：現在 = `2026-09-05T08:00:00Z`。
「還有效」= 到期於 `2026-09-05T08:15:00Z`（登入憑證）／`2026-10-05T08:00:00Z`（續用憑證）。
「已過期」= 到期於 `2026-09-05T07:59:59Z`。

## SessionDomain — 兩份各自還算不算數（US-02）

| # | 登入憑證到期 / 續用憑證到期 | 預期結果 |
|---|---|---|
| D1 | 兩份都在未來 | `accessTokenUsable(now)` = true、`refreshTokenUsable(now)` = true |
| D2 | 登入憑證過期、續用憑證未過期 | access = false、refresh = true |
| D3 | 兩份都過期 | 兩者皆 false |
| D4 | 登入憑證**正好**到期於現在 | access = **false**——到期時刻是第一個不能用的瞬間 |
| D5 | 續用憑證**正好**到期於現在 | refresh = **false** |
| D6 | 任一情況 | `accessToken()` 與 `refreshToken()` 原樣回傳兩份憑證 |

## SessionStorageProxy — 記一對（US-01）

| # | 情境 | 預期結果 |
|---|---|---|
| G1 | 寫進去再讀回來 | 兩份憑證與兩個到期時刻都一樣 |
| G2 | 什麼都沒寫過 | 回 `null` |
| G3 | 清掉之後 | 回 `null` |
| G4 | 記著的內容不是合法 JSON | 回 `null`，不拋 |
| G5 | 記著的內容少了續用憑證那一半 | 回 `null`——半份等於沒有 |
| G6 | 記著的內容少了任一個到期時刻 | 回 `null` |
| G7 | 到期時刻讀不出來 | 回 `null` |
| G8 | 瀏覽器把儲存整個關掉 | 讀回 `null`；寫入不拋；清除不拋 |

## UserSessionApplication.restoreSession（US-02、US-03）

真實 service 與 domain model，只 mock 兩個 proxy 介面。

| # | 情境 | 預期結果 |
|---|---|---|
| R1 | 沒有記住任何東西 | 回 `null`；**`fetchSignedInUser` 與 `renewSession` 都不被呼叫** |
| R2 | 續用憑證已過期 | 回 `null`；**不打後端**；`clearSession` 被呼叫 |
| R3 | 兩份都還有效 | 回目前登入者；`fetchSignedInUser` 收到的是**記著的那份登入憑證**；**`renewSession` 不被呼叫** |
| R4 | 登入憑證過期、續用憑證還有效 | `renewSession` 收到**記著的那份續用憑證**；`writeSession` 收到換回來的那一對；`fetchSignedInUser` 收到**新的**登入憑證；回目前登入者 |
| R5 | 兩份都有效，但 `fetchSignedInUser` 第一次回 `AuthenticationRequiredError` | `renewSession` 被呼叫一次；`fetchSignedInUser` 被呼叫**兩次**，第二次帶的是新的登入憑證；回目前登入者 |
| R6 | 承 R5，第二次 `fetchSignedInUser` 又被拒絕 | 回 `null`；`clearSession` 被呼叫；`renewSession` **只被呼叫過一次** |
| R7 | 承 R5，`renewSession` 被拒絕（`AuthenticationRequiredError`） | 回 `null`；`clearSession` 被呼叫；`fetchSignedInUser` 不再被呼叫 |
| R8 | 登入憑證過期，`renewSession` 拋 `BackendUnreachableError` | **拋出**該錯誤；**`clearSession` 不被呼叫** |
| R9 | 兩份都有效，`fetchSignedInUser` 拋 `BackendUnreachableError` | **拋出**該錯誤；`renewSession` 不被呼叫；`clearSession` 不被呼叫 |
| R10 | 換發成功但 `writeSession` 什麼都沒做（記不住） | 這一次仍然回得出目前登入者 |

## UserSessionApplication.signIn / registerUser（US-01）

| # | 情境 | 預期結果 |
|---|---|---|
| S1 | 帳密正確 | `writeSession` 收到後端回的那**一對**憑證（四個值都對） |
| S2 | 建立帳號成功 | `registerUser` 一次、`signIn` 一次；`writeSession` 收到那一對 |
| S3 | 後端拒絕 | 原樣拋出；`writeSession` 不被呼叫 |

## UserSessionApplication.signOut（US-04）

| # | 情境 | 預期結果 |
|---|---|---|
| O1 | 記著一對憑證 | `revokeSession` 收到**記著的那份續用憑證**；`clearSession` 被呼叫 |
| O2 | `revokeSession` 拋 `BackendUnreachableError` | **不拋給呼叫端**；`clearSession` 仍然被呼叫 |
| O3 | `revokeSession` 拋任何其他錯誤 | 同 O2 |
| O4 | 沒有記住任何東西 | `revokeSession` **不被呼叫**；`clearSession` 仍然被呼叫 |
| O5 | `clearSession` 拋出 | 不拋給呼叫端（儲存那一側保證不拋，這一條由 proxy 的 G8 守著） |

## UserProxy（US-01、US-03、US-04）

| # | 情境 | 預期結果 |
|---|---|---|
| P1 | `POST /sessions` 回四個欄位 | 回 `Session`，四個值都收得乾淨，兩個時刻是 `Date` |
| P2 | `POST /sessions/renewal` 回四個欄位 | 同上；請求 body 帶 `refreshToken` |
| P3 | `POST /sessions/renewal` 回 401 | 拋 `AuthenticationRequiredError`——與「憑證不算數」同一種 |
| P4 | `POST /sessions/renewal` 回 503 | 拋 `AccessTokenUnavailableError` |
| P5 | `POST /sessions/revocation` 回 204 | 正常結束，不回任何東西 |
| P6 | `POST /sessions/revocation` 連不上 | 拋 `BackendUnreachableError`（由呼叫端決定吞掉） |
| P7 | 三條路在後端沒啟動時 | 一律 `BackendUnreachableError`，不會被翻成憑證問題 |
