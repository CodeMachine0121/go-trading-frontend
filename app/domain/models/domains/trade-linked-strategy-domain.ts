import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const SELF_JUDGED_LABEL = new LocalizedTextVo('自行判斷', 'Self-judged')
const TRADING_STRATEGY_DELETED_LABEL = new LocalizedTextVo('關聯的交易策略已刪除', 'Linked trading strategy deleted')

export class TradeLinkedStrategyDomain {
  constructor(
    private readonly tradingStrategyId: number | null,
    private readonly tradingStrategyName: string | null,
    private readonly tradingStrategyDeleted: boolean,
  ) {}

  get label(): LocalizedTextVo {
    if (this.tradingStrategyId === null) {
      return SELF_JUDGED_LABEL
    }

    // 交易策略的名字是使用者自己取的，原樣呈現、不翻。
    return this.tradingStrategyDeleted
      ? TRADING_STRATEGY_DELETED_LABEL
      : new UntranslatedTextVo(this.tradingStrategyName ?? '')
  }
}
