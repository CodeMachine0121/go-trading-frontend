import { SignalDomain } from '~/domain/models/domains/signal-domain'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'

/**
 * 一句話裡把幾句接起來的那個字。
 *
 * 它與選單上的「全部成立（且）」是同一件事的短說法：選單要說清楚它管什麼，
 * 句子裡只要一個連接詞——讀成「突破 等於 買入 或 動能 等於 買入」。
 */
const OPERATOR_WORDS: Readonly<Record<ConditionOperatorVo, string>> = {
  and: '且',
  or: '或',
}

/** 信號比對只有一種關係，而它是固定的。 */
const RELATION_WORD = '等於'

/** 一塊什麼都不收的零件——它說不出任何一句話，所以照實說它還沒決定。 */
const NO_SIGNAL_WORDS = '（還沒選信號）'

/**
 * DTO：墊子上的一塊零件——它是哪一支策略腳本，以及它要是哪幾個信號才算數。
 *
 * `acceptedSignals` 是一個**集合**而不是一個值，因為「A 是買入或持有都算」是真的有人
 * 要說的話。空集合是一塊擺著卻什麼都不收的零件，也就是一句永遠不成立的話——
 * 所以擺上去的零件一定至少收一個。
 */
export class ConditionBoardPieceDto {
  constructor(
    public readonly sourceLabel: string,
    public readonly acceptedSignals: readonly string[],
  ) {}

  /** 「等於」——信號比對唯一的那一種關係。 */
  get relationWord(): string {
    return RELATION_WORD
  }

  /**
   * 它收的那幾個信號讀成一段話：「買入」「買入或持有」。
   *
   * 幾個信號之間是「其中之一」，所以連起來的字是「或」。
   */
  get signalWords(): string {
    if (this.acceptedSignals.length === 0) {
      return NO_SIGNAL_WORDS
    }

    return this.acceptedSignals.map(signal => new SignalDomain(signal).label()).join('或')
  }

  /** 這一條讀成一句話：「突破 等於 買入」。 */
  get sentence(): string {
    return `${this.sourceLabel} ${RELATION_WORD} ${this.signalWords}`
  }

  /**
   * 收了兩個以上信號時，它其實在說什麼。
   *
   * **一支策略腳本同一時間只吐一個信號**，所以幾個信號之間是「其中之一」，不是「而且」——
   * 而並排的開關看起來就像「而且」。使用者會盯著一條「賣出或持有」，
   * 想不通一支策略腳本怎麼可能同時是兩者；翻成「不是買入」他就懂了。
   *
   * 只收一個（或一個都沒收）時沒有任何東西需要解釋，所以是空字串。
   */
  get plainWords(): string {
    if (this.acceptedSignals.length < 2) {
      return ''
    }

    if (this.acceptedSignals.length === SIGNAL_VALUES.length) {
      return '也就是「不管它說什麼都算」'
    }

    const excluded = SIGNAL_VALUES.find(signal => !this.acceptedSignals.includes(signal))

    return `也就是「不是${excluded === undefined ? '' : new SignalDomain(excluded).label()}」`
  }
}

/**
 * DTO：墊子上的一格——一塊零件，或**扣在一起的一組零件**。
 *
 * 一組零件是為了說得出「A 而且（B 或 C）」。沒有它的話，一張墊子只說得出
 * 「這幾塊全部成立」或「這幾塊任一成立」，中間那種混著的就永遠寫不出來。
 *
 * `operator` 有值就是一組，沒有就是單獨一塊——與條件樹用同一個分辨方式，
 * 因為它們本來就是同一件事的兩種形狀。**一組裡面不會再有一組**：
 * 三層以上的巢狀在實際的條件裡幾乎不出現，而它會讓「把一塊拖到另一塊上」
 * 這個動作變得沒有人說得準結果。
 */
export class ConditionBoardItemDto {
  constructor(
    /** 一組零件怎麼合併它裡面那幾塊。單獨一塊時為 `null`。 */
    public readonly operator: ConditionOperatorVo | null,
    public readonly pieces: readonly ConditionBoardPieceDto[],
  ) {}

  get isBundle(): boolean {
    return this.operator !== null
  }

  /** 拿來當 Vue 的 key，也拿來認出「這一格是哪一格」。 */
  get key(): string {
    return this.pieces.map(piece => piece.sourceLabel).join('+')
  }

  get holdsLabels(): readonly string[] {
    return this.pieces.map(piece => piece.sourceLabel)
  }

  /** 一組裡面那幾句之間的連接詞；單獨一條時沒有。 */
  get joinerWord(): string {
    return this.operator === null ? '' : OPERATOR_WORDS[this.operator]
  }

  /** 這一格讀成一句話：「突破 等於 買入 或 動能 等於 買入」。 */
  get sentence(): string {
    return this.pieces.map(piece => piece.sentence).join(` ${this.joinerWord} `)
  }
}

/**
 * DTO：一整邊的判斷，畫成一張墊子上擺了什麼。
 *
 * 它是條件樹的另一種說法，而不是另一份資料：存出去的仍然是那棵樹。
 * 墊子說得出來的形狀是「幾格用且或或串起來，其中一格可以是一小組」——
 * 也就是兩層。那涵蓋了實際會寫的絕大多數條件。
 *
 * 說不出來的（三層以上、或組裡還有組）不會被硬塞進來：`representable` 為 false 時
 * 畫面照實說，而不是默默把它壓平成一個意思不同的條件。
 */
export class ConditionBoardDto {
  constructor(
    /** 墊子上每一格之間怎麼合併。 */
    public readonly operator: ConditionOperatorVo,
    public readonly items: readonly ConditionBoardItemDto[],
    public readonly representable: boolean,
  ) {}

  /** 墊子上一塊零件都沒有。 */
  get isEmpty(): boolean {
    return this.items.length === 0
  }

  /** 墊子上擺著的每一塊零件，不分它在哪一格。 */
  get placedLabels(): readonly string[] {
    return this.items.flatMap(item => item.holdsLabels)
  }

  /** 格與格之間的連接詞。 */
  get joinerWord(): string {
    return OPERATOR_WORDS[this.operator]
  }

  /**
   * 整張讀成一句話。
   *
   * 一組只有在**旁邊還有別的格**時才加上括號：「A 等於 買入 且（B 等於 買入 或 C 等於 買入）」。
   * 整張只有那一組時，括號什麼都沒有分開，只會讓一句話多兩個符號。
   * 一張空的回空字串——那不是一句話，由畫面說它是空的。
   */
  get sentence(): string {
    return this.items
      .map(item => (item.isBundle && this.items.length > 1 ? `（${item.sentence}）` : item.sentence))
      .join(` ${this.joinerWord} `)
  }
}
