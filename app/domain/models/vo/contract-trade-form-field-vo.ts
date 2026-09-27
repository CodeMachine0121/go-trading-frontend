export type ContractTradeFormField
  = | 'symbol'
    | 'direction'
    | 'leverage'
    | 'fillPrice'
    | 'fillQuantity'
    | 'fillTime'
    | 'fillFee'
    | 'exitQuantity'
    | 'plannedStopLossPrice'
    | 'plannedTakeProfitPrice'
    | 'confidence'
    | 'tradingStrategy'
    | 'executionScore'

export class ContractTradeFormFieldVo {
  constructor(
    public readonly field: ContractTradeFormField,
    public readonly fillIndex: number | null = null,
  ) {}
}
