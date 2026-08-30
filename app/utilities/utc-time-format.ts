/**
 * 世界標準時間的輸入與呈現格式轉換。
 *
 * 這裡是不得已才建立的技術性工具（見 .claude/rules/code-style.md 的門檻）：
 * 它完全無狀態、不碰任何領域資料、不含任何業務規則，處理的純粹是
 * 「瀏覽器的分鐘精度時間輸入」與「畫面上的時間字串」這兩種**格式**。
 * 沒有任何領域物件擁有這個行為——時間的業務規則（五分鐘刻度、不得指向未來）住在 domain。
 */

/**
 * 分鐘精度時間輸入唯一合法的值：`2026-08-30T12:00`。
 * 欄位被清空或只填一半時值不會長這樣，必須擋下來——
 * 直接把不完整的值拼成時間字串會得到一個**看似有效卻完全不對**的時間
 * （例如空字串會被解讀成西元 2000 年一月一日），那比拿到無效值危險得多。
 */
const UTC_MINUTE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

/**
 * 把分鐘精度時間輸入的值（`2026-08-30T12:00`）視為世界標準時間解讀。
 * 值不完整時回傳一個無效的時間值，由 domain 決定要怎麼告訴使用者。
 */
export function parseUtcMinuteInput(inputValue: string): Date {
  if (!UTC_MINUTE_INPUT_PATTERN.test(inputValue)) {
    return new Date(Number.NaN)
  }

  return new Date(`${inputValue}:00Z`)
}

/** 把時間值轉成分鐘精度時間輸入看得懂的值（`2026-08-30T12:00`，世界標準時間）。 */
export function formatUtcMinuteInput(date: Date): string {
  return date.toISOString().slice(0, 16)
}

/** 把時間值轉成畫面上呈現的世界標準時間字串（`2026-08-30 12:00`）。 */
export function formatUtcDateTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ')
}
