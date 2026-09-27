import type { SpotTradeRecord } from '~/domain/models/entities/spot-trade-record'

export class SpotTradeRecordPage {
  constructor(
    public readonly records: readonly SpotTradeRecord[],
    public readonly totalCount: number,
  ) {}
}
