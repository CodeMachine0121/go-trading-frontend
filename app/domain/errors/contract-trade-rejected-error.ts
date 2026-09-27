import type { ContractTradeFormFieldVo } from '~/domain/models/vo/contract-trade-form-field-vo'

export class ContractTradeRejectedError extends Error {
  constructor(
    message: string,
    public readonly formField: ContractTradeFormFieldVo | null,
    public readonly recordedTradeId: number | null = null,
    options?: { cause?: unknown },
  ) {
    super(message, options)
    this.name = 'ContractTradeRejectedError'
  }
}
