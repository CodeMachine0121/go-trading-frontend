import type Decimal from 'decimal.js'
import type { SpotTradeOutcome } from '~/domain/models/entities/spot-trade-outcome'
import { TradeOutcomeDto } from '~/domain/models/dto/trade-outcome-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const ESTIMATE_NOTE = '估算'
const NO_MARKET_DATA_MESSAGE = '沒有行情資料，無法計算'
const RETURN_RATE_FRACTION_DIGITS = 2
const SLIPPAGE_FRACTION_DIGITS = 2
const CAPTURE_RATE_FRACTION_DIGITS = 0
const PERCENT = 100

export class SpotTradeOutcomeDomain {
  constructor(
    private readonly outcome: SpotTradeOutcome,
    private readonly open: boolean,
    private readonly fromJournalLink: boolean,
  ) {}

  toDto(): TradeOutcomeDto {
    const costFigures = [
      this.signedFigure('毛損益', this.outcome.grossProfit),
      new TradeFigureVo('手續費', new JournalNumberDomain(this.outcome.totalFee).amount(), 'neutral'),
      new TradeFigureVo('買進成本', new JournalNumberDomain(this.outcome.buyCost).amount(), 'neutral'),
    ]
    const resultFigures = [
      this.signedFigure(this.open ? '已實現淨損益' : '淨損益', this.outcome.netProfit),
      new TradeMeasureDomain(this.outcome.returnRate).toFigure(
        '報酬率',
        value => new JournalNumberDomain(value.times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS),
        value => new JournalNumberDomain(value).tone()),
      new TradeMeasureDomain(this.outcome.plannedRisk).toFigure(
        '計畫風險', value => new JournalNumberDomain(value).amount(), () => 'neutral'),
      new TradeMeasureDomain(this.outcome.rMultiple).toFigure(
        'R 倍數', value => new JournalNumberDomain(value).rMultiple(), value => new JournalNumberDomain(value).tone()),
    ]
    const excursionFigures = [
      new TradeMeasureDomain(this.outcome.maximumAdverseExcursion).toFigure(
        '最大不利',
        value => new JournalNumberDomain(value).rMultiple(),
        () => 'danger',
        this.priceNote(this.outcome.maximumAdversePrice)),
      new TradeMeasureDomain(this.outcome.maximumFavorableExcursion).toFigure(
        '最大有利',
        value => new JournalNumberDomain(value).rMultiple(),
        () => 'success',
        this.priceNote(this.outcome.maximumFavorablePrice)),
      new TradeMeasureDomain(this.outcome.profitCaptureRate).toFigure(
        '利潤捕捉率',
        value => new JournalNumberDomain(value.times(PERCENT)).percentage(CAPTURE_RATE_FRACTION_DIGITS),
        () => 'neutral'),
      ...(this.open
        ? [new TradeMeasureDomain(this.outcome.floatingProfit).toFigure(
            '浮動損益',
            value => new JournalNumberDomain(value).signedAmount(),
            value => new JournalNumberDomain(value).tone(),
            ESTIMATE_NOTE)]
        : []),
      ...(this.fromJournalLink
        ? [new TradeMeasureDomain(this.outcome.entrySlippagePercentage).toFigure(
            '進場滑點',
            value => new JournalNumberDomain(value).percentage(SLIPPAGE_FRACTION_DIGITS),
            value => value.greaterThan(0) ? 'danger' : 'neutral')]
        : []),
    ]
    const excursionReasons = [
      new TradeMeasureDomain(this.outcome.maximumAdverseExcursion).unavailableReason,
      new TradeMeasureDomain(this.outcome.maximumFavorableExcursion).unavailableReason,
    ]

    return new TradeOutcomeDto(
      [costFigures, resultFigures, excursionFigures],
      excursionReasons.includes('noMarketData') ? NO_MARKET_DATA_MESSAGE : null,
    )
  }

  private signedFigure(label: string, value: Decimal): TradeFigureVo {
    return new TradeFigureVo(label, new JournalNumberDomain(value).signedAmount(), new JournalNumberDomain(value).tone())
  }

  private priceNote(price: Decimal | null): string | null {
    return price === null ? null : new JournalNumberDomain(price).price()
  }
}
