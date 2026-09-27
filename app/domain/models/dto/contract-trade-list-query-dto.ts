import type { TradeStatus } from '~/domain/models/vo/trade-status-vo'

export class ContractTradeListQueryDto {
  constructor(
    public readonly status: TradeStatus | null = null,
    public readonly symbol: string | null = null,
    public readonly limit: number | null = null,
  ) {}
}
