import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import type { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'

export class TradeTagGroupDto {
  constructor(
    public readonly kind: TradeTagKind,
    public readonly title: LocalizedTextVo,
    public readonly tags: readonly TradeTagDto[],
    public readonly emptyMessage: LocalizedTextVo,
  ) {}
}
