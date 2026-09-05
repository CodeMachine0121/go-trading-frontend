# Contract Traceability Matrix — 不必天天重登

Contract: `.sdd/2026-09-05-session-renewal/PRD.md`
Design map: `.sdd/2026-09-05-session-renewal/ARCH.md`
Implementation: `app/domain/models/{entities/session.ts,domains/session-domain.ts}`、
`app/domain/service/user-session-service.ts`、`app/infrastructure/proxy/{user-proxy,session-storage-proxy}.ts`
Oracle: Acceptance Criteria（US-01…US-04，共 15 個 scenario）

## US-01 — 記住的是一對憑證

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 登入成功記住兩份憑證與兩個到期時刻 | `writeSession` 收到那一對 | `user-session-service.ts:rememberedSignIn` | `user-session-application.spec.ts`「登入成功就記住是誰」＋`session-storage-proxy.spec.ts`「四個值都讀得回來」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 建立帳號後同樣記住一對且直接登入 | `registerUser` 一次、`signIn` 一次 | 同上 | 「建立帳號走的是另一條路」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 記著的東西壞掉時當成沒有記過 | 回 `null` | `session-storage-proxy.ts:toSession` | `session-storage-proxy.spec.ts` 九種壞法，**含上一版只記一份憑證的舊格式** | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 記不住時這一次仍然能用 | 登入成功、不顯示錯誤 | `SessionStorageProxy`（三個方法都不拋） | 「儲存整個關掉時三個動作都不拋」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-02 — 打開操作台時，能自己修好的就自己修

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-5 | 兩份都有效時不做多餘的事 | `renewSession` 不被呼叫 | `restoreSession` | 「憑證還算數時不會多做一次換發」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 登入憑證過期就先換一對 | 換發 → 記住 → 用新的問 | `restoreSession` 的 `renewedUpFront` 路徑 | 「登入憑證過期就先換一對」＋**實跑驗證**（把到期時刻撥到過去、重新整理後仍然登入，且續用憑證已輪替） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 續用憑證也過期就當作沒登入且不打後端 | 回 `null`、`clearSession` | `SessionDomain.refreshTokenUsable` | 「自己就知道已經過期的憑證不會被拿去問後端」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 沒有記住任何東西 | 回 `null`、不打後端 | `restoreSession` 第一個判斷 | 「沒有記住任何憑證就是沒登入」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-03 — 被拒絕時試著換一次，就一次

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-9 | 被拒絕時試著換一次、成功就重問 | `renewSession` 一次、`fetchSignedInUser` 兩次 | `restoreSession` 的第二條路徑 | 「後端不認得這份登入憑證時，先試著換一次再問一次」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 換發也被拒絕就當作沒登入，且不再試 | 回 `null`、`clearSession`、不再換 | `restoreSession` | 「換發本身被拒絕就當作沒登入」、「換了一份全新的還是被拒絕就放棄」、**以及 R11**（見下） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-11 | 連不上後端不代表憑證壞了 | 拋出、**不** `clearSession` | `renewedSession` / `signedInUserOrRefused` 只認 `AuthenticationRequiredError` | 「連不上後端時不丟掉記著的東西」×2（問的時候／換的時候）＋「換完之後再問時連不上」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-04 — 登出時真的去告訴後端

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-12 | 登出會請後端撤掉這段登入階段 | `revokeSession` 收到記著的續用憑證 | `user-session-service.ts:signOut` | 「請後端撤掉這台裝置的登入階段」＋**實跑驗證**（登出後拿那份續用憑證直接打後端得到 401，資料庫整條鏈皆已作廢） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-13 | 後端連不上時登出仍然成功 | 不拋、照樣 `clearSession` | `signOut` 吞掉失敗 | 「後端連不上／後端說失敗時登出仍然成功」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 沒有東西可以撤時不打擾後端 | `revokeSession` 不被呼叫 | `signOut` 先讀本機 | 「沒有東西可以撤時不打擾後端」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 回到登入畫面 | 換頁到 `/login` | `use-user-session.ts:signOut`（上一個切片，未改） | `use-user-session.spec.ts`「登出把共用狀態清乾淨」 | asserts-oracle | produces-oracle | ✅ conforms |

## §4 核心業務規則

| ID | Clause | Impl | Test | Status |
|----|--------|------|------|--------|
| BR-1 | 能先算出來的答案就不要去問 | `SessionDomain` 的兩個判斷 | AC-5、AC-7 | ✅ conforms |
| BR-2 | 換發只試一次 | `restoreSession` 的結構（無迴圈、無計數器） | AC-10 | ✅ conforms |
| BR-3 | 「被拒絕」與「連不上」是兩件事 | `signedInUserOrRefused` / `renewedSession` | AC-11 | ✅ conforms |
| BR-4 | 登出在畫面上一定要成功 | `signOut` | AC-13 | ✅ conforms |

## Orphans（有程式碼、沒有條款）

| Code | Description | Verdict |
|------|-------------|---------|
| `session-storage-proxy.ts` 沿用上一版的儲存鍵 | 舊格式會被讀成「壞掉的紀錄」 | undocumented——換鍵與不換鍵的結果都是登出一次，選少一個要記得的東西的那一邊 |
| `signedInUserOrRefused` | 把「被拒絕」變成回傳值 | undocumented——兩個呼叫端對被拒絕的下一步不同，用例外會把那個差別藏進兩個 catch |
| `renewedUpFront` | 這一趟有沒有換過 | **這一項不是裝飾，見下方第 1 點** |

## Summary

- Conforms: 19/19 clauses ✅（100%）
- Violations / Mis-asserted / Partial / Gaps / Unclear：**無**
- Orphans: 3

### 兩件必須據實說明的事

1. **實作階段抓到並修掉了一個真的缺陷，而它不在原本的 ORACLE 裡。**

   原本的路徑是：登入憑證過期 → 換一對 → 拿新的去問 → **被拒絕** → **再換一次**。
   而那「再換一次」用的是**手上原本那份續用憑證**，它在第一次換發時就已經被後端作廢了。
   後端會把它讀成「同一份被用了兩次」＝盜用，於是**把這台裝置整條登入階段撤掉**——
   使用者從「重登一次」變成「連另一台裝置也被登出」。

   修法是把「這一趟有沒有換過」先記下來：換過之後再被拒絕就直接放棄。
   ORACLE 補上 R11 並就地註明**這是補一個漏掉的案例，不是放寬既有的標準**。
   對應的 mutation 檢查（把那個判斷拿掉）確認會被測試抓到。

2. **`app/middleware/signed-in.global.ts` 仍然是 90% / 83%，而且這個切片沒有動它。**
   未覆蓋的是 `if (import.meta.server) return` 這一行；打包時它會被換成該包的字面值，
   所以在測試跑的那個（瀏覽器端）包裡恆為 `false`，沒有任何測試進得去。
   理由與上一個切片相同，此處只是重申而非新增。

   本切片新增或改動的每一個檔案（entity、domain model、service、兩個 proxy）
   的 statements 與 branches 皆為 **100%**。
