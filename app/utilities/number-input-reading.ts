/**
 * 數字輸入框交出來的東西，讀成一個真的數字——讀不成就是 `null`。
 *
 * 這裡是不得已才建立的技術性工具（見 .claude/rules/code-style.md 的門檻）：
 * 它完全無狀態、不碰任何領域資料、不含任何業務規則，處理的純粹是
 * `<input type="number">` 這個**框**的行為。哪些數字合法、不合法時要說什麼，
 * 是領域的事（見 StrategyParameterDomain 與 CalculationSpanVo 的 validationMessage）。
 *
 * 為什麼有型別上的兩種可能：Vue 對 `type="number"` 的框會先幫忙讀成數字，
 * 但讀不動的時候（空的、只打了一個負號、正在打小數點）原樣把那段文字交出來。
 *
 * 為什麼讀不成時是 `null` 而不是 0：0 是一個**合法的數字**，
 * 而它在回看根數那一種不合法。把「還在打」讀成 0，使用者會在打完之前
 * 就先看到一則錯誤——他什麼都還沒做錯。
 */
export function readNumberInput(raw: string | number): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null
  }

  const trimmed = raw.trim()
  if (trimmed === '') {
    return null
  }

  const value = Number(trimmed)

  return Number.isFinite(value) ? value : null
}
