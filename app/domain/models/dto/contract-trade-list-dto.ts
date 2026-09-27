import type { ContractTradeFigureVo } from '~/domain/models/vo/contract-trade-figure-vo'
import type { ContractTradeRecordRowDto } from '~/domain/models/dto/contract-trade-record-row-dto'

export class ContractTradeListDto {
  constructor(
    public readonly periodLabel: string,
    public readonly summaryFigures: readonly ContractTradeFigureVo[],
    public readonly rows: readonly ContractTradeRecordRowDto[],
    public readonly pendingReviewCount: number,
    public readonly symbolOptions: readonly string[],
    public readonly emptyMessage: string | null,
  ) {}
}
