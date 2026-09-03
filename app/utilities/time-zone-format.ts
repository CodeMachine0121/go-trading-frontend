/**
 * 某個瞬間在某個時區的寫法，以及那個寫法怎麼讀回瞬間。
 *
 * 這裡是不得已才建立的技術性工具（見 .claude/rules/code-style.md 的門檻）：
 * 它完全無狀態、不碰任何領域資料、不含任何業務規則，處理的純粹是
 * 「一個瞬間」與「某個時區的當地寫法」之間的**機械換算**。
 * 誰該用哪一個時區、清單上有哪些時區，是領域的事（見 TimeZoneDto / TimeZoneService）。
 */

/**
 * 分鐘精度時間輸入唯一合法的值：`2026-08-30T12:00`。
 * 欄位被清空或只填一半時值不會長這樣，必須擋下來——
 * 直接把不完整的值拼成時間字串會得到一個**看似有效卻完全不對**的時間
 * （例如空字串會被解讀成西元 2000 年一月一日），那比拿到無效值危險得多。
 */
const MINUTE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/

const MINUTES_PER_HOUR = 60
const MILLISECONDS_PER_MINUTE = 60 * 1000

/** 一個瞬間在某個時區的年月日時分秒，全部補滿兩位（年份四位）。 */
function readLocalParts(instant: Date, timeZoneIdentifier: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZoneIdentifier,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant)

  return Object.fromEntries(parts.map(part => [part.type, part.value]))
}

/** 該時區在那個瞬間相對於世界標準時間的位移（毫秒，東經為正）。 */
function offsetMillisecondsAt(instant: Date, timeZoneIdentifier: string): number {
  const localParts = readLocalParts(instant, timeZoneIdentifier)
  const localWallClockAsUtc = Date.UTC(
    Number(localParts.year),
    Number(localParts.month) - 1,
    Number(localParts.day),
    Number(localParts.hour),
    Number(localParts.minute),
    Number(localParts.second),
  )

  // 位移一律是整分鐘，所以先把秒以下抹掉再相減，否則會被毫秒帶出一個假的零頭。
  return localWallClockAsUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/** 畫面上呈現的當地時間字串（`2026-08-30 12:00`）。 */
export function formatDateTimeInTimeZone(instant: Date, timeZoneIdentifier: string): string {
  const localParts = readLocalParts(instant, timeZoneIdentifier)

  return `${localParts.year}-${localParts.month}-${localParts.day} ${localParts.hour}:${localParts.minute}`
}

/** 分鐘精度時間輸入看得懂的當地時間值（`2026-08-30T12:00`）。 */
export function formatMinuteInputInTimeZone(instant: Date, timeZoneIdentifier: string): string {
  return formatDateTimeInTimeZone(instant, timeZoneIdentifier).replace(' ', 'T')
}

/**
 * 把分鐘精度時間輸入的值當成該時區的當地時間讀回一個瞬間。
 * 值不完整時回傳一個無效的時間值，由 domain 決定要怎麼告訴使用者。
 *
 * 換算要做兩次：先把當地寫法當成世界標準時間估一個瞬間、取那一刻的位移換一次，
 * 再用換出來的那一刻的位移修正一次——否則日光節約時間切換的那一天會差一小時。
 */
export function parseMinuteInputInTimeZone(inputValue: string, timeZoneIdentifier: string): Date {
  if (!MINUTE_INPUT_PATTERN.test(inputValue)) {
    return new Date(Number.NaN)
  }

  const localWallClockAsUtc = new Date(`${inputValue}:00Z`).getTime()
  const estimatedInstant = new Date(
    localWallClockAsUtc - offsetMillisecondsAt(new Date(localWallClockAsUtc), timeZoneIdentifier))

  return new Date(localWallClockAsUtc - offsetMillisecondsAt(estimatedInstant, timeZoneIdentifier))
}

/** 該時區在那個瞬間的位移標籤（`UTC+08:00`、`UTC-04:00`、`UTC+00:00`）。 */
export function formatUtcOffsetLabel(instant: Date, timeZoneIdentifier: string): string {
  const offsetMinutes = offsetMillisecondsAt(instant, timeZoneIdentifier) / MILLISECONDS_PER_MINUTE
  const sign = offsetMinutes < 0 ? '-' : '+'
  const absoluteMinutes = Math.abs(offsetMinutes)
  const hours = String(Math.floor(absoluteMinutes / MINUTES_PER_HOUR)).padStart(2, '0')
  const minutes = String(absoluteMinutes % MINUTES_PER_HOUR).padStart(2, '0')

  return `UTC${sign}${hours}:${minutes}`
}
