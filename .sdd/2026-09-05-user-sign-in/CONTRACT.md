# Contract Traceability Matrix — 登入畫面

Contract: `.sdd/2026-09-05-user-sign-in/PRD.md`
Design map: `.sdd/2026-09-05-user-sign-in/ARCH.md`
Implementation: `app/domain/`、`app/application/user-session-application.ts`、
`app/infrastructure/proxy/{user-proxy,access-token-storage-proxy}.ts`、
`app/composables/use-user-session.ts`、`app/middleware/signed-in.global.ts`、
`app/components/{organisms/SignInPanel.vue,molecules/SignedInUserBadge.vue}`、`app/pages/login.vue`
Oracle: Acceptance Criteria（US-01…US-07，共 27 個 scenario）

每一列的 Spec-expected 都先只從 PRD 推導，再回頭看實作與測試各自是否產出／斷言了它。

## US-01 — 一張卡片，兩種模式

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-1 | 預設是登入 | 標題與主要動作都寫「登入」 | `SignInPanel.vue` | `SignInPanel.spec.ts`「一開始是登入」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-2 | 切到建立帳號 | 兩處都變成「建立帳號」 | `SignInPanel.vue` | 「切過去就是建立帳號」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-3 | 切換時已打好的內容留著 | 兩格的值不變 | `SignInPanel.vue` | 「切換時已經打好的內容留著」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-4 | 切換時清掉上一次的錯誤訊息 | 訊息消失 | `SignInPanel.vue` 發 `modeChange` → `login.vue` 呼叫 `clearSubmissionFeedback` | 「切換時說一聲」＋`use-user-session.spec.ts`「切換模式時上一次的訊息被清掉」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-02 — 送出之前先擋掉明顯填錯的

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-5 | 電子郵件空白就不送出 | 不打後端，該格底下說明必須填 | `credentials-domain.ts` | `credentials-domain.spec.ts`（空字串／只有空白）＋`user-session-application.spec.ts`「兩格沒填好就完全不打後端」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-6 | 密碼空白就不送出 | 同上 | `credentials-domain.ts` | 「密碼是空的就不送出」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-7 | 建立帳號時密碼太短就不送出 | 該格底下說明至少 8 個字元 | `credentials-domain.ts` | 「少一個字元」＋「五個表情符號只有五個字元」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-8 | 建立帳號時剛好 8 個字元送得出去 | 送出 | `credentials-domain.ts` | 「剛好 8 個字元」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-9 | 建立帳號時密碼太長就不送出 | 該格底下說明太長 | `credentials-domain.ts` | 「多一個位元組」「二十五個中文字」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-10 | 登入不套用建立時的長度規則 | 照樣送出 | `credentials-domain.ts`（模式是它的一部分） | 「比建立時的下限短／上限長」兩列 | asserts-oracle | produces-oracle | ✅ conforms |

## US-03 — 送出中不重複送

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-11 | 送出期間主要動作按不下去 | 那顆鍵 `disabled`，再送也不送出 | `SignInPanel.vue`＋`use-user-session.ts` | 「送出期間那顆鍵按不下去」「送出期間再送一次也不會真的送出去」「還在送的時候不送第二次」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-12 | 送出期間仍然打得了字 | 兩格不 `disabled` | `SignInPanel.vue` | 同上一則的後半 | asserts-oracle | produces-oracle | ✅ conforms |

## US-04 — 失敗時如實轉達，並且留在畫面上

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-13 | 帳密對不上 | 卡片上出現「電子郵件或密碼不正確」，留在登入畫面，兩格不清空 | `user-proxy.ts`＋`use-user-session.ts` | `user-proxy.spec.ts`「帳密對不上是自己一種拒絕」＋`use-user-session.spec.ts`（同時斷言完全不換頁） | asserts-oracle | produces-oracle | ✅ conforms |
| AC-14 | 電子郵件已經有人用了 | 卡片上出現後端那句話 | `user-proxy.ts` | `user-proxy.spec.ts`「電子郵件被佔用是自己一種拒絕」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-15 | 連不上後端 | 說連不上，不是說帳密不正確 | `backend-api-proxy.ts`（沿用）＋`use-user-session.ts` | `user-proxy.spec.ts`「後端沒啟動仍然是連不上」＋composable 的錯誤對映 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-16 | 後端簽不出憑證 | 說明這不是使用者填錯了什麼 | `user-proxy.ts`＋`use-user-session.ts` | `user-proxy.spec.ts`「簽不出憑證與帳密錯是兩件事」＋composable 的對映 | asserts-oracle | produces-oracle | ✅ conforms |

## US-05 — 登入之後就記著

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-17 | 登入成功就記住憑證 | `writeAccessToken` 收到那份憑證 | `user-session-service.ts` | `user-session-application.spec.ts`「成功就把憑證記起來」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-18 | 重新整理仍然是登入狀態，且認得出是誰 | 讀回憑證 → 問出目前登入者 | `user-session-service.ts`＋`access-token-storage-proxy.ts` | 「憑證還算數就拿它去問出目前登入者」＋`access-token-storage-proxy.spec.ts`「寫進去的讀得回來」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-19 | 建立帳號成功後直接就是登入狀態 | 建完緊接著登入一次 | `user-session-service.ts` | 「建立成功之後直接就是登入狀態」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-20 | 瀏覽器記不住東西時這一次仍然能用 | 登入成功，不顯示錯誤 | `access-token-storage-proxy.ts`（三個方法都不拋） | `access-token-storage-proxy.spec.ts`「儲存整個關掉時三個動作都不拋」＋application 那一則 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-21 | 記著的憑證已經過期 | 視同沒有登入 | `access-token-domain.ts`＋`user-session-service.ts` | `access-token-domain.spec.ts` 四列＋「自己就知道已經過期的憑證不會被拿去問後端」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-06 — 沒登入就只看得到登入畫面

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-22 | 沒登入時走到任何一頁都被帶到登入畫面 | 導向 `/login` | `signed-in.global.ts` | `signed-in.global.spec.ts`「沒登入時走到操作台會被帶到登入畫面」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-23 | 已登入時走得到操作台 | 不導向 | `signed-in.global.ts` | 「已登入時走得到操作台」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-24 | 已登入的人走到登入畫面會被帶回首頁 | 導向 `/` | `signed-in.global.ts` | 「已經進門的人走到登入畫面會被帶回首頁」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-25 | 登入後停在原本想去的那一頁 | 換頁到記下的那一頁 | `signed-in.global.ts` 記下、`use-user-session.ts` 用掉 | `signed-in.global.spec.ts`「記下他本來要去哪」＋`use-user-session.spec.ts`「回到他被擋下來時想去的那一頁」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-26 | 沒有原本想去的地方就去首頁 | 換頁到 `/` | `use-user-session.ts` | 「沒有被擋下來過就去首頁」 | asserts-oracle | produces-oracle | ✅ conforms |

## US-07 — 認得他是誰，也走得掉

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| AC-27 | 側欄底下顯示目前登入者 | 寫著他的電子郵件 | `SignedInUserBadge.vue`＋`ConsoleLayout` 的 `account` 插槽 | `SignedInUserBadge.spec.ts`「寫著現在是誰在用」 | asserts-oracle | produces-oracle | ✅ conforms |
| AC-28 | 登出把憑證丟掉並回到登入畫面 | 不再記著憑證，換頁到 `/login` | `user-session-service.ts`＋`use-user-session.ts` | `user-session-application.spec.ts`「丟掉憑證，而且完全不碰後端」＋`use-user-session.spec.ts`「登出把共用狀態清乾淨」 | asserts-oracle | produces-oracle | ✅ conforms |

## §4 核心業務規則（PRD Business Flow & Logic）

| ID | Clause | Spec-expected (oracle) | Impl | Test | Test audit | Code audit | Status |
|----|--------|------------------------|------|------|------------|------------|--------|
| BR-1 | 畫面這一關是省一趟來回，不是規則的所在地 | 格式不判、長度只在建立時判 | `credentials-domain.ts` | 「看起來不像電子郵件也送得出去」兩列 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-2 | 憑證只記在這台瀏覽器，記不住不影響這一次 | 寫入失敗不拋 | `access-token-storage-proxy.ts` | 見 AC-20 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-3 | 登出不必問後端 | 後端一次都不被碰到 | `user-session-service.ts` | 「完全不碰後端」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-4 | 把關只在瀏覽器這一側做 | 伺服器端一律放行 | `signed-in.global.ts` | — | no-test（見下方說明） | produces-oracle | 🟡 partial |
| BR-5 | 憑證還在但後端不認得 → 視同沒登入並丟掉 | `clearAccessToken` 被呼叫 | `user-session-service.ts` | 「後端不認得這份憑證就把它丟掉」 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-6 | 送出到一半後端斷線 → 說連不上，兩格內容留著 | 不換頁、不清空 | `use-user-session.ts` | 錯誤對映那一組同時斷言不換頁 | asserts-oracle | produces-oracle | ✅ conforms |
| BR-7 | 登出再登入另一個帳號 → 側欄立刻換人 | 共用狀態被清乾淨 | `use-user-session.ts` | 「登出把共用狀態清乾淨」 | asserts-oracle | produces-oracle | ✅ conforms |

## Orphans（有程式碼、沒有條款）

| Code | Description | Verdict |
|------|-------------|---------|
| `app.vue` 只在登入後才掛出助手 | 助手要花錢、而且讀得到行情 | undocumented——PRD 沒寫，但一個沒登入的人叫得出付費助手，會讓整道門形同虛設 |
| `SignedInUserBadge` 不套 `dense-label` | 那個 mixin 會把字轉成大寫 | undocumented——大寫過的電子郵件看起來像另一個位址；由該元件的測試守著 title 仍讀得到全文 |
| `SignInPanel` 的 `autocomplete` 隨模式換 | 建立帳號時提示瀏覽器提議新密碼 | undocumented——給錯的話密碼管理器會一直塞舊密碼進來 |
| `backend-api-proxy.ts` 多一個 `headers` 選項 | 讓「我是誰」帶得出憑證 | undocumented——它是**選項**不是自動附上，這一點寫在該檔的註解裡 |

## Summary

- Conforms: 34/35 clauses ✅（97%）
- Violations: 無
- Mis-asserted: 無
- Partial: BR-4 🟡
- Gaps: 無
- Unclear: 無
- Orphans: 4（皆為協定／介面層面的必要收緊，無一違反條款）

### 一件必須據實說明的事

**BR-4「把關只在瀏覽器這一側做」沒有測試，而且測不了。**
它是 `if (import.meta.server) return` 這一行。Nuxt 在打包時把 `import.meta.server`
換成該包的字面值，所以在測試跑的那個（瀏覽器端）包裡，它恆為 `false`——
沒有任何測試進得去那條分支。為它開一個注入點只是為了讓覆蓋率好看，
那正是這套做法明講要避免的憑空一般化。因此保留該行、逐行人工稽核，並在此記下，
而不是把 `app/middleware/signed-in.global.ts` 的 90% / 83% 說成 100%。

其餘每一個新增檔案（domain model、service、application、兩個 proxy、composable、兩個元件）
的 statements 與 branches 皆為 **100%**。
