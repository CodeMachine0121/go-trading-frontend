# Architecture — 被鎖在門外時看得懂發生什麼事

**PRD:** `.sdd/2026-09-19-sign-in-attempt-lockout/PRD.md`

---

## 1. Design Goal

讓「被鎖住」沿著**這個專案既有的那條路**走完全程，一步都不繞。

登入失敗的翻譯在這個專案裡已經有一條成形的路：
後端狀態碼 →（Proxy）哨兵錯誤 →（`messageFor`）一句話 → 畫面那一行紅字。
`CredentialsRejectedError`、`EmailAlreadyRegisteredError`、`AccessTokenUnavailableError`
三者都走這一條。第四種沒有任何理由走別條。

所以這個切片的設計重點不是「發明什麼」，而是**不要發明**：
新增一個哨兵錯誤、在 Proxy 多認一個狀態碼、在 `messageFor` 多一條分支。
畫面、元件、composable 的對外形狀**一個字都不改**。

---

## 2. Change Scope

### 新增

| 元件 | 層 | 單一職責 |
| :--- | :--- | :--- |
| `SignInLockedError` | `domain/errors/` | 哨兵錯誤：後端說這個帳號被鎖住，**帶著可以再試的時刻**（可能為 `null`） |

### 動到的

| 元件 | 改什麼 |
| :--- | :--- |
| `UserProxy.signInFailureOf` | 多認 **429**，把 `lockedUntil` 收成 `Date` 或 `null`，包成 `SignInLockedError` |
| `use-user-session.ts` 的 `messageFor` | 多一條分支：被鎖住 → 組出含當地時間的那句話 |

### 刻意**不**動的

- **`SignInPanel.vue`。** 它收的還是 `errorMessage: string | null`。
  被鎖住與帳密不對在畫面上是同一行紅字（PRD §5），所以元件沒有第二種狀態要認。
  讓它認，等於把「有幾種登入失敗」這個知識複製到畫面上，而它原本不需要知道。
- **`IUserProxy`。** `signIn` 的簽章沒變——它還是成功回 `Session`、失敗拋錯誤。
  多一種失敗不是介面的改變。
- **`use-user-session` 的對外形狀。** `errorMessage` 還是那一個字串。
- **建立帳號那條路。** 後端鎖的是登入，`registrationFailureOf` 不必認 429。

---

## 3. New Component

```ts
export class SignInLockedError extends Error {
  readonly lockedUntil: Date | null
}
```

**`Date | null` 而不是 `Date`。** 後端沒給、或給了一個讀不出來的值，
都收成 `null`，而**錯誤本身照樣拋出來**。

這是整個切片最重要的一個決定：**「說不出時間」不可以退化成「帳密不正確」。**
退回去的那一句會讓使用者繼續試密碼，而那正是這個功能要終結的行為。
所以時刻是選填的，被鎖住這件事不是。

## 4. Modified Components

### `UserProxy.signInFailureOf`

多一個狀態碼常數 `SIGN_IN_LOCKED_STATUS = 429`，比照既有三個的寫法。

`lockedUntil` 的解讀**刻意寬鬆**：讀不出來就是 `null`，不拋。
這與同檔的 `momentIn()` 相反——那裡讀不出來會拋，因為一份沒有到期時刻的憑證
**沒辦法拿來用**；這裡讀不出來只是少一句話能說，而主要的事實還在。
兩種寬嚴不同是刻意的，並在程式碼裡寫明。

### `messageFor`

```
被鎖住 且 有時刻 → 「這個帳號因為連續登入失敗已被鎖住，{當地日期時間} 之後才能再試。」
被鎖住 且 無時刻 → 「這個帳號因為連續登入失敗已被鎖住，請稍後再試。」
```

當地時間由 `Intl.DateTimeFormat`（瀏覽器內建）格式化，**不引入任何套件**，
也**不寫死時區**——時區取自使用者的瀏覽器。

`messageFor` 已經是那句話唯一的家（既有註解就是這樣寫的），所以第四種也住這裡。

---

## 5. The Axis of Change

**最可能的下一個需求：把還剩幾次機會也顯示出來**
（「再錯一次就會被鎖住」）。

它會打在哪裡：後端得先回那個數字 → `SignInLockedError` 之外**另一個**哨兵錯誤
（因為那是「還沒被鎖住」的狀態，不是這一種的一個欄位），
外加 `messageFor` 一條分支。**這一條路承接得了它，而且不必改任何既有的分支。**

**次可能的：倒數計時。** PRD 已排除。真要做的話，
它需要的東西（那個時刻）**已經在 `SignInLockedError` 上了**，
所以那會是畫面層的新增，不是這條翻譯路徑的改動。

---

## 6. Traceability

| PRD Scenario | 由誰滿足 |
| :--- | :--- |
| 帳密不正確照舊只有原本那一句 | `signInFailureOf` 的 401 分支（未改動） |
| 被鎖住時顯示的是另一句話，並寫出可以再試的時間 | `signInFailureOf` 429 分支 + `messageFor` 新分支 |
| 世界標準時間換算成使用者當地時間 | `messageFor` 的 `Intl.DateTimeFormat` |
| 日期與時間都要寫出來 | 同上（格式選項含年月日與時分） |
| 沒有附上時間時仍然說被鎖住 | `SignInLockedError.lockedUntil = null`，錯誤照樣拋 |
| 附了一個讀不出來的時間時仍然說被鎖住 | 同上（寬鬆解讀） |
| 切換到建立帳號時這句話消失 | 既有的 `clearSubmissionFeedback`（未改動） |
| 被鎖住時登入按鈕仍然按得下去 | `SignInPanel.vue` 未改動——它從來不因錯誤停用按鈕 |
