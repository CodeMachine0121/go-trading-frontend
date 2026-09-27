import type { ContractTradeRecordWriteDto } from '~/domain/models/dto/contract-trade-record-write-dto'
import type { ContractTradeFillWriteDto } from '~/domain/models/dto/contract-trade-fill-write-dto'

export class ContractTradeRecordSubmissionDto {
  constructor(
    public readonly record: ContractTradeRecordWriteDto,
    public readonly additionalFills: readonly ContractTradeFillWriteDto[],
  ) {}
}
