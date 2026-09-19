/**
 * 哨兵錯誤：後端說這個帳號因為連續登入失敗被鎖住了。
 *
 * 它與帳密不正確**非分開不可**，因為使用者該做的事完全相反：
 * 一個是再打一次密碼，另一個是**不要再打密碼了，等到某個時間點**。
 * 講同一句的話，一個密碼其實記得很清楚的人會重試一整週，而每一次都不會有任何不同。
 */
export class SignInLockedError extends Error {
  /**
   * 什麼時候可以再試，後端說不出來時是 `null`。
   *
   * 選填的是**時刻**，不是被鎖住這件事。後端沒附上時刻、或附了一個讀不出來的值，
   * 這個錯誤照樣被拋出來——少一句話能說，好過退回去說「電子郵件或密碼不正確」，
   * 因為那一句會讓使用者繼續試密碼。
   */
  readonly lockedUntil: Date | null

  constructor(message: string, lockedUntil: Date | null, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SignInLockedError'
    this.lockedUntil = lockedUntil
  }
}
