import type Decimal from 'decimal.js'
import type { ContractTradeOutcome } from '~/domain/models/entities/contract-trade-outcome'
import { ContractTradeOutcomeDto } from '~/domain/models/dto/contract-trade-outcome-dto'
import { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import { ContractTradeMeasureDomain } from '~/domain/models/domains/contract-trade-measure-domain'
import { JournalNumberDomain } from '~/domain/models/domains/journal-number-domain'

const ESTIMATE_NOTE = '估算'
const FEE_RATE_MISSING_NOTE = '未設定費率'
const EXCLUDES_FUNDING_NOTE = '未含資金費用'
const SLIPPAGE_FRACTION_DIGITS = 2
const CAPTURE_RATE_FRACTION_DIGITS = 0
const PERCENT = 100

export class ContractTradeOutcomeDomain {
  constructor(
    private readonly outcome: ContractTradeOutcome,
    private readonly open: boolean,
    private readonly fromJournalLink: boolean,
  ) {}

  toDto(): ContractTradeOutcomeDto {
    const figures = [
      this.signedFigure('毛損益', this.outcome.grossProfit),
      new ContractTradeFigureVo(
        '手續費',
        new JournalNumberDomain(this.outcome.totalFee).amount(),
        'neutral',
        this.outcome.feeRateMissing ? FEE_RATE_MISSING_NOTE : null),
      new ContractTradeMeasureDomain(this.outcome.fundingFee).toFigure(
        '資金費用',
        (value) => {
          const amount = new JournalNumberDomain(value.abs()).amount()
          if (value.isZero()) {
            return amount
          }

          return value.isNegative() ? `付出 ${amount}` : `收到 ${amount}`
        },
        value => new JournalNumberDomain(value).tone()),
      this.signedFigure(
        this.open ? '已實現淨損益' : '淨損益',
        this.outcome.netProfit,
        this.outcome.netProfitExcludesFunding ? EXCLUDES_FUNDING_NOTE : null),
      new ContractTradeMeasureDomain(this.outcome.plannedRisk).toFigure(
        '計畫風險', value => new JournalNumberDomain(value).amount(), () => 'neutral'),
      new ContractTradeMeasureDomain(this.outcome.rMultiple).toFigure(
        'R 倍數', value => new JournalNumberDomain(value).rMultiple(), value => new JournalNumberDomain(value).tone()),
      new ContractTradeMeasureDomain(this.outcome.maximumAdverseExcursion).toFigure(
        '最大不利',
        value => new JournalNumberDomain(value).rMultiple(),
        () => 'danger',
        this.priceNote(this.outcome.maximumAdversePrice)),
      new ContractTradeMeasureDomain(this.outcome.maximumFavorableExcursion).toFigure(
        '最大有利',
        value => new JournalNumberDomain(value).rMultiple(),
        () => 'success',
        this.priceNote(this.outcome.maximumFavorablePrice)),
      new ContractTradeMeasureDomain(this.outcome.profitCaptureRate).toFigure(
        '利潤捕捉率',
        value => new JournalNumberDomain(value.times(PERCENT)).percentage(CAPTURE_RATE_FRACTION_DIGITS),
        () => 'neutral'),
      ...(this.open
        ? [
            new ContractTradeMeasureDomain(this.outcome.floatingProfit).toFigure(
              '浮動損益',
              value => new JournalNumberDomain(value).signedAmount(),
              value => new JournalNumberDomain(value).tone(),
              ESTIMATE_NOTE),
            new ContractTradeMeasureDomain(this.outcome.estimatedLiquidationPrice).toFigure(
              '預估強平價',
              value => new JournalNumberDomain(value).price(),
              () => 'neutral',
              ESTIMATE_NOTE),
          ]
        : []),
      ...(this.fromJournalLink
        ? [new ContractTradeMeasureDomain(this.outcome.entrySlippagePercentage).toFigure(
            '進場滑點',
            value => new JournalNumberDomain(value).percentage(SLIPPAGE_FRACTION_DIGITS),
            value => value.greaterThan(0) ? 'danger' : 'neutral')]
        : []),
    ]

    const excursionReasons = [
      new ContractTradeMeasureDomain(this.outcome.maximumAdverseExcursion).unavailableReason,
      new ContractTradeMeasureDomain(this.outcome.maximumFavorableExcursion).unavailableReason,
    ]

    return new ContractTradeOutcomeDto(
      figures,
      excursionReasons.includes('noMarketData') ? '沒有行情資料，無法計算' : null,
    )
  }

  private signedFigure(label: string, value: Decimal, note: string | null = null): ContractTradeFigureVo {
    return new ContractTradeFigureVo(
      label, new JournalNumberDomain(value).signedAmount(), new JournalNumberDomain(value).tone(), note)
  }

  private priceNote(price: Decimal | null): string | null {
    return price === null ? null : new JournalNumberDomain(price).price()
  }
}
