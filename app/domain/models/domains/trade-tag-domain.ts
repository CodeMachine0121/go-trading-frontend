import type { TradeTag } from '~/domain/models/entities/trade-tag'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const GROUP_TITLES: Readonly<Record<TradeTagKind, LocalizedTextVo>> = {
  mistake: new LocalizedTextVo('失誤標籤', 'Mistake tags'),
  setup: new LocalizedTextVo('型態標籤', 'Setup tags'),
}

const GROUP_EMPTY_MESSAGES: Readonly<Record<TradeTagKind, LocalizedTextVo>> = {
  mistake: new LocalizedTextVo('還沒有失誤標籤', 'No mistake tags yet'),
  setup: new LocalizedTextVo('還沒有型態標籤，可以在交易上就地新增', 'No setup tags yet—you can add them right on a trade'),
}

const GROUP_ORDER: readonly TradeTagKind[] = ['mistake', 'setup']

export class TradeTagDomain {
  constructor(private readonly tags: readonly TradeTag[]) {}

  toGroupDtos(): TradeTagGroupDto[] {
    return GROUP_ORDER.map(kind => new TradeTagGroupDto(
      kind,
      GROUP_TITLES[kind],
      this.tags
        .filter(tag => tag.kind === kind)
        .map(tag => tag.toDto()),
      GROUP_EMPTY_MESSAGES[kind],
    ))
  }
}
