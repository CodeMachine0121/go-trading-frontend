import type { TradeTag } from '~/domain/models/entities/trade-tag'
import type { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'

export interface ITradeTagProxy {
  listTags(): Promise<TradeTag[]>
  createTag(writeDto: TradeTagWriteDto): Promise<TradeTag>
  renameTag(id: number, name: string): Promise<TradeTag>
  deleteTag(id: number): Promise<void>
}
