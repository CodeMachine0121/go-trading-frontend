# Contract Verification — 被鎖在門外時看得懂發生什麼事

**Oracle:** `PRD.md` §3 Acceptance Criteria（9 個 Scenario）＋ §6 Non-Functional Requirements
**Scope:** `go-trading-frontend`
**Ceiling:** 靜態一致性稽核——逐條把**測試的斷言**與**程式碼的路徑**各自對照規格推導出的預期，
不以整套測試綠燈為判準。

---

## Clauses

| ID | Clause | Oracle（只由規格推導） | Implementation | Test | Test audit | Code audit | Status |
| :-- | :--- | :--- | :--- | :--- | :--- | :--- | :-- |
| AC-1 | 帳密不正確照舊只有原本那一句 | 顯示「電子郵件或密碼不正確」 | `user-proxy.ts:198`（401 分支，未改動） | `use-user-session.spec.ts:172`（既有） | asserts-oracle | produces-oracle | ✅ |
| AC-2 | 被鎖住時顯示的是另一句話，並寫出可以再試的時間 | 畫面說被鎖住、寫出該時刻、**不含**「電子郵件或密碼不正確」 | `user-proxy.ts:192` + `use-user-session.ts:354,385` | `use-user-session.spec.ts:194` | asserts-oracle | produces-oracle | ✅ |
| AC-3 | 世界標準時間換算成使用者當地時間 | 寫出的是當地時刻，不是 UTC 原樣 | `use-user-session.ts:391`（`Intl.DateTimeFormat(undefined, …)`） | `use-user-session.spec.ts:194`（期望值由同一個時區規則算出，非寫死字串） | asserts-oracle | produces-oracle | ✅ |
| AC-4 | 日期與時間都要寫出來 | 內容同時含日期與時分 | `use-user-session.ts:391`（`dateStyle` + `timeStyle`） | `use-user-session.spec.ts:212`（`toContain('2026')` + `/\d{1,2}:\d{2}/`） | asserts-oracle | produces-oracle | ✅ |
| AC-5 | 沒有附上時間時仍然說被鎖住 | 說被鎖住；**不**顯示「電子郵件或密碼不正確」 | `user-proxy.ts:250`（`undefined` → `null`）+ `use-user-session.ts:387` | `use-user-session.spec.ts:223`、`user-proxy.spec.ts:187` | asserts-oracle | produces-oracle | ✅ |
| AC-6 | 附了一個讀不出來的時間時仍然說被鎖住 | 同 AC-5 | `user-proxy.ts:250`（`NaN` → `null`，**不拋**） | `user-proxy.spec.ts:202` | asserts-oracle | produces-oracle | ✅ |
| AC-7 | 切換到建立帳號時這句話消失 | 畫面上沒有任何錯誤訊息 | `use-user-session.ts` `clearSubmissionFeedback`（**未改動**） | `use-user-session.spec.ts:266`（既有） | asserts-oracle | produces-oracle | ✅ |
| AC-8 | 被鎖住時登入按鈕仍然按得下去 | 按鈕沒有被停用 | `SignInPanel.vue:151`——停用條件只看 `pending`，**與錯誤無關**（未改動） | *(既有元件測試涵蓋 `pending` 行為)* | asserts-oracle | produces-oracle | ✅ |
| NFR-1 | 時區一律取自使用者的瀏覽器 | 不寫死任何時區 | `use-user-session.ts:391`（locale 與時區皆傳 `undefined`） | `use-user-session.spec.ts:194` | asserts-oracle | produces-oracle | ✅ |
| NFR-2 | 時間點取自後端的獨立欄位，不從句子裡解析 | 句子裡沒有時間也讀得到時刻 | `backend-api-proxy.ts:212` → `user-proxy.ts:194` | `user-proxy.spec.ts:172`（句子刻意不含任何時間） | asserts-oracle | produces-oracle | ✅ |
| NFR-3 | 不引入任何新的相依套件 | `package.json` 不變 | `Intl.DateTimeFormat`（瀏覽器內建） | *(靜態檢查：`package.json` 無變動)* | n/a | produces-oracle | ✅ |

---

## Orphans

| 行為 | 位置 | 判定 |
| :--- | :--- | :--- |
| `BackendRequestRejectedError.retryableFrom` 以**通用**名稱存在，而 wire 欄位叫 `lockedUntil` | `backend-request-rejected-error.ts` | **不是違規**——這個錯誤服務所有功能，不該認得「登入鎖」這個概念。翻譯發生在 `user-proxy`，與同檔 `field` / `parameterName` 的作法一致 |

**Out of Scope 檢查**：PRD 排除的四項（倒數計時、解鎖操作、把兩格標紅、剩幾次機會）
**程式碼中皆無對應實作**。`SignInPanel.vue` 一個字都沒改。✅

---

## Summary

```
✅ 11 conforms · 🔴 0 violations · 🟠 0 mis-asserted · 🟡 0 partial · ❌ 0 gaps · ❔ 0 unclear · ⚠️ 0 orphans
Conformance: 100%（11 / 11）
```

**變更程式碼覆蓋率**：`sign-in-locked-error.ts`、`user-proxy.ts`、`backend-api-proxy.ts`、
`backend-request-rejected-error.ts` 皆 **100%**；`use-user-session.ts` 未覆蓋的行
（225–253）全屬既有程式碼，本次新增的 354–355、385–396 全數覆蓋。

**突變驗證**：6 個突變全數被測試殺掉——
429 不再被認得、讀不出來的時刻整個拒絕被丟掉、從句子裡挖時刻、
被鎖住退回帳密不正確、時刻印成 UTC 原樣、沒有時刻時退成一般錯誤。

---

## improve-codebase：評估後不改，以及為什麼

| 候選 | 判斷 |
| :--- | :--- |
| `signInLockedMessageFor` 只有一個呼叫端，依規則「只被 1 個 public 使用就 inline」 | **保留。** 它與 `messageFor` 的**變更理由不同**：一個是「把時刻寫成人讀得懂的樣子」，一個是「哪一種錯誤對應哪一句話」。格式或時區要改時不該碰到分派表，反之亦然。內聯八行也會把原本一眼看完的分派表埋掉 |
| 把那句話搬到 `SignInLockedError` 上，讓錯誤自己會講 | **拒絕。** 那是畫面的用詞，不是領域的事實。領域錯誤帶的是**時刻**（機器讀的），畫面決定**怎麼講**（人讀的）——這條界線正是這個切片在後端也劃過一次的那一條 |
| 把 `SignInLockedError` 的 `lockedUntil` 改成必填，讓型別擋住「沒有時刻」 | **拒絕。** 那會逼 proxy 在讀不出來時整個拒絕丟掉，而使用者就會退回去讀到「電子郵件或密碼不正確」——**恰好是這個功能要終結的那句話**。選填的是時刻，不是被鎖住這件事 |
| `BackendRequestRejectedError` 的選填欄位已累積到五個，是「參數列不斷變長」的味道 | **不在本切片處理。** 屬實，但那是既有結構的問題，順手重構它會讓這次的改動範圍失控。記在這裡供之後單獨處理 |
