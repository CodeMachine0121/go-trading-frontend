import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const MINUTE_MILLISECONDS = 60 * 1000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const DEFAULT_HOLDING_WORD = new LocalizedTextVo('持倉', 'Held')

export class TradeHoldingDurationDomain {
  constructor(
    private readonly openedAt: Date,
    private readonly closedAt: Date,
    private readonly holdingWord: LocalizedTextVo = DEFAULT_HOLDING_WORD,
  ) {}

  get text(): LocalizedTextVo {
    const totalMinutes = Math.max(0, Math.floor((this.closedAt.getTime() - this.openedAt.getTime()) / MINUTE_MILLISECONDS))
    const totalHours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
    const days = Math.floor(totalHours / HOURS_PER_DAY)
    const hours = totalHours % HOURS_PER_DAY
    const minutes = totalMinutes % MINUTES_PER_HOUR
    const word = this.holdingWord

    if (days > 0) {
      return new LocalizedTextVo(
        `${word.traditionalChinese} ${days} 天 ${hours} 小時`, `${word.english} ${days}d ${hours}h`)
    }

    return totalHours > 0
      ? new LocalizedTextVo(
          `${word.traditionalChinese} ${hours} 小時 ${minutes} 分`, `${word.english} ${hours}h ${minutes}m`)
      : new LocalizedTextVo(`${word.traditionalChinese} ${minutes} 分`, `${word.english} ${minutes}m`)
  }
}
