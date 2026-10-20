import Decimal from 'decimal.js'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { StrategyBotCapitalAllocationDto } from '~/domain/models/dto/strategy-bot-capital-allocation-dto'
import { StrategyBotCapitalAllocationRowDto } from '~/domain/models/dto/strategy-bot-capital-allocation-row-dto'
import { StrategyBotCapitalAllocationSummaryDto } from '~/domain/models/dto/strategy-bot-capital-allocation-summary-dto'
import type { PositionSizingDomain } from '~/domain/models/domains/position-sizing-domain'
import { STRATEGY_BOT_LIMITS } from '~/domain/models/vo/strategy-bot-limits-vo'

export class StrategyBotCapitalAllocationDomain {
  constructor(
    private readonly symbols: readonly string[],
    private readonly allocations: readonly StrategyBotCapitalAllocationDto[],
  ) {}

  equallySplit(): StrategyBotCapitalAllocationDto[] {
    if (this.symbols.length === 0) {
      return []
    }

    const percentage = new Decimal(STRATEGY_BOT_LIMITS.allocationPercentageMaximum)
      .dividedBy(this.symbols.length)
      .toDecimalPlaces(STRATEGY_BOT_LIMITS.allocationPercentageDecimalPlaces, Decimal.ROUND_DOWN)

    return this.symbols.map(symbol => new StrategyBotCapitalAllocationDto(symbol, percentage))
  }

  get isEqualSplit(): boolean {
    const equalSplit = this.equallySplit()

    return this.allocations.length === equalSplit.length
      && equalSplit.every(expected => this.percentageOf(expected.symbol)?.equals(expected.allocationPercentage) === true)
  }

  reallocatedTo(symbols: readonly string[]): StrategyBotCapitalAllocationDto[] {
    if (this.isEqualSplit) {
      return new StrategyBotCapitalAllocationDomain(symbols, []).equallySplit()
    }

    return this.allocations.filter(allocation => symbols.includes(allocation.symbol))
  }

  get rejection(): LocalizedTextVo | null {
    if (this.allocations.length === 0) {
      return null
    }

    const missingSymbol = this.symbols.find(symbol => this.percentageOf(symbol) === undefined)
    if (missingSymbol !== undefined) {
      return new LocalizedTextVo(
        `${missingSymbol} 沒有分配比例——要嘛每個監聽標的都給，要嘛都不給`,
        `${missingSymbol} has no allocation percentage: give one for every watched symbol or for none`)
    }

    const outOfRange = this.allocations.find(allocation => !this.isWithinRange(allocation.allocationPercentage))
    if (outOfRange !== undefined) {
      return new LocalizedTextVo(
        `${outOfRange.symbol} 的分配比例必須大於 0、不超過 ${STRATEGY_BOT_LIMITS.allocationPercentageMaximum}（單位：%）`,
        `The allocation percentage of ${outOfRange.symbol} must be greater than 0 and at most ${STRATEGY_BOT_LIMITS.allocationPercentageMaximum} (percent)`)
    }

    const tooPrecise = this.allocations.find(allocation =>
      allocation.allocationPercentage.decimalPlaces() > STRATEGY_BOT_LIMITS.allocationPercentageDecimalPlaces)
    if (tooPrecise !== undefined) {
      return new LocalizedTextVo(
        `${tooPrecise.symbol} 的分配比例最多到小數點後兩位`,
        `The allocation percentage of ${tooPrecise.symbol} can have at most two decimal places`)
    }

    const total = this.totalPercentage
    if (total.greaterThan(STRATEGY_BOT_LIMITS.allocationPercentageMaximum)) {
      return new LocalizedTextVo(
        `分配比例加起來是 ${total.toString()}%，不得超過 ${STRATEGY_BOT_LIMITS.allocationPercentageMaximum}%`,
        `The allocation percentages add up to ${total.toString()}%, more than ${STRATEGY_BOT_LIMITS.allocationPercentageMaximum}%`)
    }

    return null
  }

  allocatedCapitalOf(symbol: string, capital: Decimal | null): Decimal | null {
    const percentage = this.percentageOf(symbol)
    if (capital === null || !capital.greaterThan(0) || percentage === undefined || !this.isWithinRange(percentage)) {
      return null
    }

    return capital.times(percentage).dividedBy(STRATEGY_BOT_LIMITS.allocationPercentageMaximum)
  }

  toSummaryDto(capital: Decimal | null, positionSizing: PositionSizingDomain): StrategyBotCapitalAllocationSummaryDto {
    const total = this.totalPercentage
    const maximum = new Decimal(STRATEGY_BOT_LIMITS.allocationPercentageMaximum)

    return new StrategyBotCapitalAllocationSummaryDto(
      total,
      Decimal.max(0, maximum.minus(total)),
      total.greaterThan(maximum),
      this.symbols.map((symbol) => {
        const allocatedCapital = this.allocatedCapitalOf(symbol, capital)

        return new StrategyBotCapitalAllocationRowDto(
          symbol,
          allocatedCapital,
          allocatedCapital === null ? null : positionSizing.shortfallLabelWithin(allocatedCapital))
      }),
    )
  }

  private get totalPercentage(): Decimal {
    return this.allocations
      .map(allocation => allocation.allocationPercentage)
      .filter(percentage => !percentage.isNaN())
      .reduce((total, percentage) => total.plus(percentage), new Decimal(0))
  }

  private percentageOf(symbol: string): Decimal | undefined {
    return this.allocations.find(allocation => allocation.symbol === symbol)?.allocationPercentage
  }

  private isWithinRange(percentage: Decimal): boolean {
    return percentage.greaterThan(0) && percentage.lessThanOrEqualTo(STRATEGY_BOT_LIMITS.allocationPercentageMaximum)
  }
}
