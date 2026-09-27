import type { ContractTradeRecordSummary } from '~/domain/models/entities/contract-trade-record-summary'

export class ContractTradeRecordPage {
  constructor(
    public readonly records: readonly ContractTradeRecordSummary[],
    public readonly total: number,
  ) {}
}
