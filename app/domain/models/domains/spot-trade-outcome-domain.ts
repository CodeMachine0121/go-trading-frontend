import type Decimal from 'decimal.js'
import type { SpotTradeOutcome } from '~/domain/models/entities/spot-trade-outcome'
import { TradeOutcomeDto } from '~/domain/models/dto/trade-outcome-dto'
import { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import { TradeMeasureDomain } from '~/domain/models/domains/trade-measure-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const ESTIMATE_NOTE = new LocalizedTextVo('估算', 'Estimate')
const NO_MARKET_DATA_MESSAGE = new LocalizedTextVo('沒有行情資料，無法計算', 'No market data, cannot be calculated')
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
      this.signedFigure(new LocalizedTextVo('毛損益', 'Gross P&L'), this.outcome.grossProfit),
      new TradeFigureVo(
        new LocalizedTextVo('手續費', 'Fees'),
        new UntranslatedTextVo(new JournalNumberDomain(this.outcome.totalFee).amount()),
        'neutral'),
      new TradeFigureVo(
        new LocalizedTextVo('買進成本', 'Buy cost'),
        new UntranslatedTextVo(new JournalNumberDomain(this.outcome.buyCost).amount()),
        'neutral'),
    ]
    const resultFigures = [
      this.signedFigure(
        this.open ? new LocalizedTextVo('已實現淨損益', 'Realized net P&L') : new LocalizedTextVo('淨損益', 'Net P&L'),
        this.outcome.netProfit),
      new TradeMeasureDomain(this.outcome.returnRate).toFigure(
        new LocalizedTextVo('報酬率', 'Return'),
        value => new UntranslatedTextVo(
          new JournalNumberDomain(value.times(PERCENT)).signedPercentage(RETURN_RATE_FRACTION_DIGITS)),
        value => new JournalNumberDomain(value).tone()),
      new TradeMeasureDomain(this.outcome.plannedRisk).toFigure(
        new LocalizedTextVo('計畫風險', 'Planned risk'),
        value => new UntranslatedTextVo(new JournalNumberDomain(value).amount()),
        () => 'neutral'),
      new TradeMeasureDomain(this.outcome.rMultiple).toFigure(
        new LocalizedTextVo('R 倍數', 'R multiple'),
        value => new UntranslatedTextVo(new JournalNumberDomain(value).rMultiple()),
        value => new JournalNumberDomain(value).tone()),
    ]
    const excursionFigures = [
      new TradeMeasureDomain(this.outcome.maximumAdverseExcursion).toFigure(
        new LocalizedTextVo('最大不利', 'Max adverse'),
        value => new UntranslatedTextVo(new JournalNumberDomain(value).rMultiple()),
        () => 'danger',
        this.priceNote(this.outcome.maximumAdversePrice)),
      new TradeMeasureDomain(this.outcome.maximumFavorableExcursion).toFigure(
        new LocalizedTextVo('最大有利', 'Max favorable'),
        value => new UntranslatedTextVo(new JournalNumberDomain(value).rMultiple()),
        () => 'success',
        this.priceNote(this.outcome.maximumFavorablePrice)),
      new TradeMeasureDomain(this.outcome.profitCaptureRate).toFigure(
        new LocalizedTextVo('利潤捕捉率', 'Profit capture'),
        value => new UntranslatedTextVo(
          new JournalNumberDomain(value.times(PERCENT)).percentage(CAPTURE_RATE_FRACTION_DIGITS)),
        () => 'neutral'),
      ...(this.open
        ? [new TradeMeasureDomain(this.outcome.floatingProfit).toFigure(
            new LocalizedTextVo('浮動損益', 'Unrealized P&L'),
            value => new UntranslatedTextVo(new JournalNumberDomain(value).signedAmount()),
            value => new JournalNumberDomain(value).tone(),
            ESTIMATE_NOTE)]
        : []),
      ...(this.fromJournalLink
        ? [new TradeMeasureDomain(this.outcome.entrySlippagePercentage).toFigure(
            new LocalizedTextVo('進場滑點', 'Entry slippage'),
            value => new UntranslatedTextVo(new JournalNumberDomain(value).percentage(SLIPPAGE_FRACTION_DIGITS)),
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

  private signedFigure(label: LocalizedTextVo, value: Decimal): TradeFigureVo {
    return new TradeFigureVo(
      label, new UntranslatedTextVo(new JournalNumberDomain(value).signedAmount()), new JournalNumberDomain(value).tone())
  }

  private priceNote(price: Decimal | null): LocalizedTextVo | null {
    return price === null ? null : new UntranslatedTextVo(new JournalNumberDomain(price).price())
  }
}
