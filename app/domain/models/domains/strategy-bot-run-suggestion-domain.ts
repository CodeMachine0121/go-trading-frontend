import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'
import type { StrategyBotRunRecord } from '~/domain/models/entities/strategy-bot-run-record'

/** 後端的方向拼法對到畫面上的詞。認不得的不在這裡——不猜。 */
const DIRECTION_WORDS: Readonly<Record<string, LocalizedTextVo>> = {
  long: new LocalizedTextVo('做多', 'Long'),
  short: new LocalizedTextVo('做空', 'Short'),
}

/** 一句話的每一段之間用什麼隔開，兩種語言都一樣。 */
const PART_SEPARATOR = new UntranslatedTextVo(' · ')
const WORD_SEPARATOR = new UntranslatedTextVo(' ')

/**
 * Domain Model：一輪建議過的部位，寫成一句話的規則。
 *
 * 現貨那一輪只說押多少：「押 5000 · 停損 … · 停利 …」。
 * 合約那一輪（記得方向、槓桿或名目任何一樣）先說它是哪個方向、幾倍，
 * 押下去的叫**保證金**、實際承擔的叫**名目**——那正是回頭對訊息的人要找的東西：
 * 「做空 5 倍 · 保證金 1000 · 名目 5000 · 停損 102 · 停利 96」。
 *
 * 出場價有才寫；沒有開倉金額（沒有建議、交易所不收）就整段不寫。
 * 認不得的方向不寫：寫錯方向比不寫更糟，那是在告訴他當時該往哪邊下單。
 */
export class StrategyBotRunSuggestionDomain {
  constructor(private readonly runRecord: StrategyBotRunRecord) {}

  toText(): LocalizedTextVo | null {
    const stake = this.runRecord.suggestedStake
    if (stake === null) {
      return null
    }

    const exitParts = [
      this.runRecord.suggestedStopLossPrice === null
        ? null
        : new LocalizedTextVo(
            `停損 ${this.runRecord.suggestedStopLossPrice.toString()}`,
            `Stop loss ${this.runRecord.suggestedStopLossPrice.toString()}`),
      this.runRecord.suggestedTakeProfitPrice === null
        ? null
        : new LocalizedTextVo(
            `停利 ${this.runRecord.suggestedTakeProfitPrice.toString()}`,
            `Take profit ${this.runRecord.suggestedTakeProfitPrice.toString()}`),
    ]

    const isContractRound = this.runRecord.suggestedDirection !== null
      || this.runRecord.suggestedLeverage !== null
      || this.runRecord.suggestedNotional !== null

    if (!isContractRound) {
      return PART_SEPARATOR.join([
        new LocalizedTextVo(`押 ${stake.toString()}`, `Stake ${stake.toString()}`),
        ...exitParts,
      ])
    }

    // 只認這張表自己的鍵：沿著原型找到的 `constructor`、`toString` 不是方向。
    const direction = this.runRecord.suggestedDirection
    const directionWords = direction !== null && Object.hasOwn(DIRECTION_WORDS, direction)
      ? DIRECTION_WORDS[direction] ?? null
      : null

    const directionAndLeverage = WORD_SEPARATOR.join([
      directionWords,
      this.runRecord.suggestedLeverage === null
        ? null
        : new LocalizedTextVo(
            `${this.runRecord.suggestedLeverage.toString()} 倍`,
            `${this.runRecord.suggestedLeverage.toString()}x`),
    ])

    return PART_SEPARATOR.join([
      directionAndLeverage.traditionalChinese === '' ? null : directionAndLeverage,
      new LocalizedTextVo(`保證金 ${stake.toString()}`, `Margin ${stake.toString()}`),
      this.runRecord.suggestedNotional === null
        ? null
        : new LocalizedTextVo(
            `名目 ${this.runRecord.suggestedNotional.toString()}`,
            `Notional ${this.runRecord.suggestedNotional.toString()}`),
      ...exitParts,
    ])
  }
}
