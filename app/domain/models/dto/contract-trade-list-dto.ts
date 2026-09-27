import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { ContractTradeRecordRowDto } from '~/domain/models/dto/contract-trade-record-row-dto'

export class ContractTradeListDto {
  constructor(
    public readonly periodLabel: string,
    public readonly tradeCountsLabel: string,
    public readonly summaryFigures: readonly TradeFigureVo[],
    public readonly rows: readonly ContractTradeRecordRowDto[],
    public readonly pendingReviewCount: number,
    public readonly symbolOptions: readonly string[],
    public readonly emptyMessage: string | null,
  ) {}
}
