import type { TradeFigureVo } from '~/domain/models/vo/trade-figure-vo'
import type { ContractTradeRecordRowDto } from '~/domain/models/dto/contract-trade-record-row-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export class ContractTradeListDto {
  constructor(
    public readonly periodLabel: LocalizedTextVo,
    public readonly tradeCountsLabel: LocalizedTextVo,
    public readonly summaryFigures: readonly TradeFigureVo[],
    public readonly rows: readonly ContractTradeRecordRowDto[],
    public readonly pendingReviewCount: number,
    public readonly symbolOptions: readonly string[],
    public readonly emptyMessage: LocalizedTextVo | null,
  ) {}
}
