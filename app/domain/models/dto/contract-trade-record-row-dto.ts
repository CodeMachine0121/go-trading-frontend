import type { ContractTradeStatus } from '~/domain/models/vo/contract-trade-status-vo'
import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import type { ContractTradeBadgeTone } from '~/domain/models/vo/contract-trade-badge-tone-vo'

export class ContractTradeRecordRowDto {
  constructor(
    public readonly id: number,
    public readonly symbol: string,
    public readonly directionLabel: string,
    public readonly directionTone: ContractTradeBadgeTone,
    public readonly status: ContractTradeStatus,
    public readonly statusLabel: string,
    public readonly statusTone: ContractTradeBadgeTone,
    public readonly pendingReview: boolean,
    public readonly sourceLabel: string,
    public readonly averageEntryPriceText: string,
    public readonly averageExitPriceText: string,
    public readonly profit: ContractTradeFigureVo,
    public readonly rMultipleText: string,
    public readonly tagNames: readonly string[],
  ) {}
}
