import type { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'

export class TradeRejectedError extends Error {
  constructor(
    message: string,
    public readonly formField: TradeFormFieldVo | null,
    public readonly recordedTradeId: number | null = null,
    public readonly savedFillCount = 0,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'TradeRejectedError'
  }
}
