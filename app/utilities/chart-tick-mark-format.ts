import type { TickMarkType, Time } from 'lightweight-charts'
import { formatDateTimeInTimeZone } from '~/utilities/time-zone-format'

type TickMarkTypes = typeof import('lightweight-charts').TickMarkType

/**
 * 繪圖函式庫時間軸上一格刻度的寫法：不得已才建立的框架黏合（見 .claude/rules/code-style.md 的門檻）。
 * 函式庫預設照瀏覽器的語言寫刻度、換顯示語言也不換，所以一律寫成不分語言的數字。
 */
export function formatWallClockTickMark(
  time: Time, tickMarkType: TickMarkType, tickMarkTypes: TickMarkTypes): string {
  const localDateTime = formatDateTimeInTimeZone(new Date(Number(time) * 1000), 'UTC')

  switch (tickMarkType) {
    case tickMarkTypes.Year:
      return localDateTime.slice(0, 4)
    case tickMarkTypes.Month:
      return localDateTime.slice(0, 7)
    case tickMarkTypes.DayOfMonth:
      return localDateTime.slice(5, 10)
    default:
      return localDateTime.slice(11, 16)
  }
}
