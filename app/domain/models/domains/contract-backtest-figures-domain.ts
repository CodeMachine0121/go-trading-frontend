import type Decimal from 'decimal.js'
import type { ContractBacktestFigures } from '~/domain/models/entities/backtest'
import { ContractTradingModeDomain } from '~/domain/models/domains/contract-trading-mode-domain'
import { ContractBacktestSummaryDto } from '~/domain/models/dto/contract-backtest-summary-dto'

const AMOUNT_FRACTION_DIGITS = 2
const WIN_RATE_FRACTION_DIGITS = 1
const WIN_RATE_NOT_APPLICABLE = '不適用'

/** 沒有完整分級時的那一種，也是認不得的依據的讀法：它是比較保守的那一句說明。 */
const SMALLEST_TIER_BASIS = {
  label: '最小那一級',
  note: '這個標的沒有完整分級，每一種大小都照最小那一級算——大部位的強平價會被算得太遠。',
}

const MAINTENANCE_MARGIN_BASES: Readonly<Record<string, { label: string, note: string }>> = {
  tiers: {
    label: '完整分級',
    note: '分級沒有歷史：重演過去用的也是今天這一組。',
  },
  smallestTier: SMALLEST_TIER_BASIS,
}

/**
 * Domain Model：合約重演成績單多出的那幾格，負責把它們寫成可以直接畫的字。
 *
 * 資金費用的正負在這裡翻成「付出／收到」：一個帶負號的費用讀起來像退款還是像少賠，
 * 每個人讀法不同；寫成字就只有一種讀法。
 */
export class ContractBacktestFiguresDomain {
  constructor(private readonly figures: ContractBacktestFigures) {}

  toSummaryDto(): ContractBacktestSummaryDto {
    const basis = MAINTENANCE_MARGIN_BASES[this.figures.maintenanceMarginBasisKind]
      ?? SMALLEST_TIER_BASIS

    return new ContractBacktestSummaryDto(
      new ContractTradingModeDomain(this.figures.tradingMode).label(),
      `${this.figures.leverage.toString()} 倍`,
      this.figures.liquidationExitCount,
      this.fundingFeeLabel(this.figures.totalFundingFee),
      this.figures.totalFundingFee.isZero()
        ? 'neutral'
        : (this.figures.totalFundingFee.isPositive() ? 'negative' : 'positive'),
      this.figures.longTradeCount,
      this.winRateLabel(this.figures.longWinRate),
      this.figures.shortTradeCount,
      this.winRateLabel(this.figures.shortWinRate),
      this.figures.blockedOpeningCount,
      basis.label,
      basis.note,
      this.figures.maintenanceMarginConfirmedAt,
    )
  }

  private fundingFeeLabel(fundingFee: Decimal): string {
    if (fundingFee.isZero()) {
      return fundingFee.abs().toFixed(AMOUNT_FRACTION_DIGITS)
    }

    return fundingFee.isPositive()
      ? `付出 ${fundingFee.toFixed(AMOUNT_FRACTION_DIGITS)}`
      : `收到 ${fundingFee.abs().toFixed(AMOUNT_FRACTION_DIGITS)}`
  }

  private winRateLabel(winRate: number | null): string {
    return winRate === null
      ? WIN_RATE_NOT_APPLICABLE
      : `${(winRate * 100).toFixed(WIN_RATE_FRACTION_DIGITS)}%`
  }
}
