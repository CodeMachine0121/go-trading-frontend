import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { ContractAutoOrderResult } from '~/domain/models/entities/contract-auto-order-result'
import { ContractAutoOrderResultDto } from '~/domain/models/dto/contract-auto-order-result-dto'

/** 一句話的每一段之間用什麼隔開，兩種語言都一樣。 */
const PART_SEPARATOR = new UntranslatedTextVo(' · ')

/** 還沒做完、或認不得的那一種。 */
const PENDING_STATUS = { label: new LocalizedTextVo('等待下單', 'Pending'), tone: 'neutral' as const }

/** 交易服務的狀態拼法對到畫面上的詞與語氣。 */
const STATUSES: Readonly<Record<string, { label: LocalizedTextVo, tone: ContractAutoOrderResultDto['tone'] }>> = {
  pending: PENDING_STATUS,
  filled: { label: new LocalizedTextVo('成交', 'Filled'), tone: 'success' },
  partiallyDone: {
    label: new LocalizedTextVo('平倉了但新方向沒開成', 'Closed, new side not opened'), tone: 'warning',
  },
  notPlaced: { label: new LocalizedTextVo('沒有下單', 'Not placed'), tone: 'warning' },
  abandoned: { label: new LocalizedTextVo('放棄', 'Given up'), tone: 'warning' },
}

/** 交易服務寫好的動作詞對到英文；認不得的原樣呈現，不猜。 */
const ACTIONS: Readonly<Record<string, string>> = {
  做多: 'Long',
  做空: 'Short',
  平多: 'Close long',
  平空: 'Close short',
  反手做多: 'Reverse to long',
  反手做空: 'Reverse to short',
  平倉: 'Close',
}

/**
 * Domain Model：一輪的下單結果怎麼說、用什麼語氣。
 *
 * 一句話照固定的順序串起來：狀態、動作、平倉、開倉、止損、止盈、原因——有才寫。
 * 認不得的狀態一律說「等待下單」：把一個不認得的結果說成成交，是在告訴他一筆不知道有沒有的單已經成了。
 * 止損或止盈沒掛上時，不論狀態都用危險的語氣並另寫一行——那是他現在就得處理的事。
 */
export class ContractAutoOrderResultDomain {
  constructor(private readonly result: ContractAutoOrderResult) {}

  toDto(): ContractAutoOrderResultDto {
    // 只認這兩張表自己的鍵：沿著原型找到的 `constructor`、`toString` 不是狀態也不是動作。
    const status = (Object.hasOwn(STATUSES, this.result.status) ? STATUSES[this.result.status] : undefined)
      ?? PENDING_STATUS
    const englishAction = (Object.hasOwn(ACTIONS, this.result.action) ? ACTIONS[this.result.action] : undefined)
      ?? this.result.action
    const action = this.result.action === '' ? null : new LocalizedTextVo(this.result.action, englishAction)

    const text = PART_SEPARATOR.join([
      status.label,
      action,
      this.result.closedQuantity === null || this.result.closeAveragePrice === null
        ? null
        : new LocalizedTextVo(
            `平倉 ${this.result.closedQuantity.toFixed()} @ ${this.result.closeAveragePrice.toFixed()}`,
            `Closed ${this.result.closedQuantity.toFixed()} @ ${this.result.closeAveragePrice.toFixed()}`),
      this.result.openedQuantity === null || this.result.openAveragePrice === null
        ? null
        : new LocalizedTextVo(
            `開倉 ${this.result.openedQuantity.toFixed()} @ ${this.result.openAveragePrice.toFixed()}`,
            `Opened ${this.result.openedQuantity.toFixed()} @ ${this.result.openAveragePrice.toFixed()}`),
      this.result.stopLossPrice === null
        ? null
        : new LocalizedTextVo(
            `止損 ${this.result.stopLossPrice.toFixed()}`, `Stop loss ${this.result.stopLossPrice.toFixed()}`),
      this.result.takeProfitPrice === null
        ? null
        : new LocalizedTextVo(
            `止盈 ${this.result.takeProfitPrice.toFixed()}`, `Take profit ${this.result.takeProfitPrice.toFixed()}`),
      this.result.reason === '' ? null : new UntranslatedTextVo(this.result.reason),
    ])

    return new ContractAutoOrderResultDto(
      text,
      this.result.protectionMissing ? 'danger' : status.tone,
      this.result.protectionMissing
        ? new LocalizedTextVo(
            '止損或止盈沒有掛上，請立刻到幣安自己處理',
            'A stop-loss or take-profit order was not placed. Go to Binance and handle it yourself now.')
        : null,
    )
  }
}
