export type TradeFormField
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

export class TradeFormFieldVo {
  constructor(
    public readonly field: TradeFormField,
    public readonly fillIndex: number | null = null,
  ) {}
}
