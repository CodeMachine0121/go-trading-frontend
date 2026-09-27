import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

export class TradeTag {
  constructor(
    public readonly id: number,
    public readonly kind: TradeTagKind,
    public readonly name: string,
  ) {}

  toDto(): TradeTagDto {
    return new TradeTagDto(this.id, this.kind, this.name)
  }
}
