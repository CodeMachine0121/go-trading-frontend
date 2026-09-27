import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'

export class TradeTagWriteDto {
  constructor(
    public readonly kind: TradeTagKind,
    public readonly name: string,
  ) {}
}
