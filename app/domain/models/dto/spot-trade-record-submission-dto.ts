import type { SpotTradeRecordWriteDto } from '~/domain/models/dto/spot-trade-record-write-dto'
import type { SpotTradeFillWriteDto } from '~/domain/models/dto/spot-trade-fill-write-dto'

export class SpotTradeRecordSubmissionDto {
  constructor(
    public readonly record: SpotTradeRecordWriteDto,
    public readonly additionalFills: readonly SpotTradeFillWriteDto[],
  ) {}
}
