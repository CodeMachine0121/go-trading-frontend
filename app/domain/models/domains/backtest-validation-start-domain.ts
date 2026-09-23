import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

/**
 * Domain Model：驗證起點——期間裡切出調參段與驗證段的那一刻。
 *
 * 它只守一條規則：**落在期間之內**。等於起點代表調參段一格都沒有，等於或晚於終點代表驗證段一格都沒有；
 * 兩段是否真的湊得出走完的格子，要看那段時間有沒有行情，那是交易服務才答得出的事。
 */
export class BacktestValidationStartDomain {
  constructor(
    private readonly validationStartTime: Date | null,
    private readonly startTime: Date,
    private readonly endTime: Date,
  ) {}

  validate(): void {
    if (this.validationStartTime === null) {
      return
    }

    const validationStart = this.validationStartTime.getTime()
    if (Number.isNaN(validationStart)
      || validationStart <= this.startTime.getTime()
      || validationStart >= this.endTime.getTime()) {
      throw new BacktestFieldError(
        'validationStartTime', '驗證起點必須落在期間之內（晚於起點、早於終點）')
    }
  }
}
