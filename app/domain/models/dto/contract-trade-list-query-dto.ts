import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'

export class ContractTradeListQueryDto {
  constructor(
    public readonly status: ContractTradeStatus | null = null,
    public readonly symbol: string | null = null,
    public readonly limit: number | null = null,
  ) {}
}
