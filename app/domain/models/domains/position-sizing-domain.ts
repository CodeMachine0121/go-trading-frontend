import Decimal from 'decimal.js'
import type { PositionSizingMode } from '~/domain/models/vo/position-sizing-mode-vo'
import { PositionSizingModeOptionDto } from '~/domain/models/dto/position-sizing-mode-option-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/** 百分比的上限：押下全部可用資金，也就是與全押等價的那一點。 */
const ONE_HUNDRED_PERCENT = new Decimal(100)

/** 每一種模式怎麼稱呼、要不要填數字、那一格叫什麼。 */
const POSITION_SIZING_DESCRIPTIONS: Readonly<
  Record<PositionSizingMode, { label: string, valueLabel: string }>
> = {
  allIn: { label: '全押', valueLabel: '' },
  percentage: { label: '可用資金的百分比', valueLabel: '百分比' },
  fixedAmount: { label: '固定金額', valueLabel: '金額' },
}

/**
 * Domain Model：每次開倉押多少。
 *
 * 「旁邊那一格要不要出現」與「那一格填的合不合法」是同一件事的兩半，所以在一起：
 * 分開放，畫面就得自己記住「只有全押不用填」——而多一種不必填的模式時，
 * 它會安靜地繼續要求填數字。
 */
export class PositionSizingDomain {
  constructor(
    private readonly mode: PositionSizingMode,
    private readonly value: Decimal,
  ) {}

  /** 這個模式旁邊要不要出現一格數字。 */
  get requiresValue(): boolean {
    return this.mode !== 'allIn'
  }

  /** 這個模式在選單上長什麼樣。 */
  toOptionDto(): PositionSizingModeOptionDto {
    const description = POSITION_SIZING_DESCRIPTIONS[this.mode]

    return new PositionSizingModeOptionDto(
      this.mode, description.label, this.requiresValue, description.valueLabel)
  }

  /**
   * 這一格填的講不講得通。
   *
   * 不必填的模式一律通過，連看都不看那個數字——使用者從百分比切到全押時，
   * 那一格留著的 50 不該讓他送不出去；而他切回來時它還在，正是他要的。
   */
  validate(): void {
    if (!this.requiresValue) {
      return
    }

    if (this.value.isNaN()) {
      throw new BacktestFieldError('positionSizingValue', '請填一個數字。')
    }

    if (this.mode === 'percentage'
      && (this.value.lessThanOrEqualTo(0) || this.value.greaterThan(ONE_HUNDRED_PERCENT))) {
      throw new BacktestFieldError(
        'positionSizingValue', '百分比要大於零且不超過一百。')
    }

    if (this.mode === 'fixedAmount' && this.value.lessThanOrEqualTo(0)) {
      throw new BacktestFieldError('positionSizingValue', '固定金額要大於零。')
    }
  }
}
