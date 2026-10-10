import type { BacktestRun } from '~/domain/models/entities/backtest-run'
import type { BacktestRunKind } from '~/domain/models/vo/backtest-run-kind-vo'
import { BACKTEST_RUN_KINDS, FALLBACK_BACKTEST_RUN_KIND } from '~/domain/models/vo/backtest-run-kind-vo'
import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'
import type { BacktestRunStatusTone } from '~/domain/models/vo/backtest-run-status-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import { AggregationIntervalDomain } from '~/domain/models/domains/aggregation-interval-domain'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { BacktestRunStatusDomain } from '~/domain/models/domains/backtest-run-status-domain'
import { BacktestRunDto } from '~/domain/models/dto/backtest-run-dto'
import { BacktestRunDetailDto } from '~/domain/models/dto/backtest-run-detail-dto'

const PART_SEPARATOR = new LocalizedTextVo(' · ', ' · ')
const RATE_FRACTION_DIGITS = 1

/**
 * Domain Model：一筆回測輪次在畫面上該長什麼樣——狀態詞與語氣、還跟不跟、能不能取消、
 * 要跑什麼、結束後那一句。認不得的狀態讀成失敗，進度收在 0 到 100 之間。
 */
export class BacktestRunDomain {
  private readonly statusDomain: BacktestRunStatusDomain
  readonly kind: BacktestRunKind
  readonly progressPercent: number

  constructor(private readonly run: BacktestRun) {
    this.statusDomain = new BacktestRunStatusDomain(run.status)
    this.kind = BACKTEST_RUN_KINDS.find(kind => kind === run.kind) ?? FALLBACK_BACKTEST_RUN_KIND
    this.progressPercent = Math.min(Math.max(Math.round(run.progressPercent), 0), 100)
  }

  get status(): BacktestRunStatus {
    return this.statusDomain.value
  }

  get isActive(): boolean {
    return this.statusDomain.isActive
  }

  get canCancel(): boolean {
    return this.isActive
  }

  get statusLabel(): LocalizedTextVo {
    return this.statusDomain.label()
  }

  get statusTone(): BacktestRunStatusTone {
    return this.statusDomain.tone
  }

  /** 標的、刻度，合約的另寫槓桿與交易模式：`BTCUSDT · 1 小時 · 2x · 只做多`。 */
  get description(): LocalizedTextVo {
    return PART_SEPARATOR.join([
      new UntranslatedTextVo(this.run.symbol),
      new AggregationIntervalDomain(this.run.interval).label(),
      this.run.leverage === null ? null : new UntranslatedTextVo(`${this.run.leverage.toString()}x`),
      this.run.tradingMode === null ? null : new ContractTradingModeDomain(this.run.tradingMode).label(),
    ])
  }

  /** 結束之後的一句話；還沒結束是 `null`。 */
  get outcome(): LocalizedTextVo | null {
    if (this.status === 'failed') {
      return new LocalizedTextVo(`失敗：${this.run.failureReason}`, `Failed: ${this.run.failureReason}`)
    }
    if (this.status === 'cancelled') {
      return this.statusLabel
    }
    if (this.status !== 'succeeded'
      || this.run.totalReturnRate === null
      || this.run.maximumDrawdown === null
      || this.run.tradeCount === null) {
      return null
    }

    const returnRate = this.signedPercent(this.run.totalReturnRate)
    const drawdown = this.percent(this.run.maximumDrawdown)

    return new LocalizedTextVo(
      `${returnRate} · 最大回撤 ${drawdown} · ${this.run.tradeCount} 筆`,
      `${returnRate} · max drawdown ${drawdown} · ${this.run.tradeCount} trades`)
  }

  private signedPercent(rate: number): string {
    const percent = this.percent(Math.abs(rate))

    return rate < 0 ? `-${percent}` : `+${percent}`
  }

  private percent(rate: number): string {
    return `${(rate * 100).toFixed(RATE_FRACTION_DIGITS)}%`
  }

  toDto(): BacktestRunDto {
    return new BacktestRunDto(
      this.run.id,
      this.kind,
      this.status,
      this.statusLabel,
      this.statusTone,
      this.progressPercent,
      this.isActive,
      this.canCancel,
      this.description,
      this.run.subjectName,
      this.run.strategyScriptId,
      this.run.tradingStrategyId,
      this.run.startTime,
      this.run.endTime,
      this.run.submittedAt,
      this.run.finishedAt,
      this.outcome,
    )
  }

  toDetailDto(): BacktestRunDetailDto {
    return new BacktestRunDetailDto(
      this.toDto(),
      this.run.result === null ? null : this.run.result.toDomain().toDto())
  }
}
