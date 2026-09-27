import type Decimal from 'decimal.js'

export class ContractTradeSource {
  constructor(
    public readonly strategyBotName: string,
    public readonly runNumber: number,
    public readonly referencePrice: Decimal | null,
    public readonly suggestedStopLossPrice: Decimal | null,
    public readonly suggestedTakeProfitPrice: Decimal | null,
  ) {}
}
