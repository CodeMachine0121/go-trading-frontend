const MINUTE_MILLISECONDS = 60 * 1000
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24

export class TradeHoldingDurationDomain {
  constructor(
    private readonly openedAt: Date,
    private readonly closedAt: Date,
    private readonly holdingWord: string = '持倉',
  ) {}

  get text(): string {
    const totalMinutes = Math.max(0, Math.floor((this.closedAt.getTime() - this.openedAt.getTime()) / MINUTE_MILLISECONDS))
    const totalHours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
    const days = Math.floor(totalHours / HOURS_PER_DAY)
    const hours = totalHours % HOURS_PER_DAY
    const minutes = totalMinutes % MINUTES_PER_HOUR

    if (days > 0) {
      return `${this.holdingWord} ${days} 天 ${hours} 小時`
    }

    return totalHours > 0 ? `${this.holdingWord} ${hours} 小時 ${minutes} 分` : `${this.holdingWord} ${minutes} 分`
  }
}
