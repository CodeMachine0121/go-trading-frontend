/**
 * 世界標準時間的輸入與呈現格式轉換。
 *
 * 這裡是不得已才建立的技術性工具（見 .claude/rules/code-style.md 的門檻）：
 * 它完全無狀態、不碰任何領域資料、不含任何業務規則，處理的純粹是
 * 「瀏覽器的分鐘精度時間輸入」與「畫面上的時間字串」這兩種**格式**。
 * 沒有任何領域物件擁有這個行為——時間的業務規則（五分鐘刻度、不得指向未來）住在 domain。
 */

/** 把分鐘精度時間輸入的值（`2026-08-30T12:00`）視為世界標準時間解讀。 */
export function parseUtcMinuteInput(inputValue: string): Date {
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
