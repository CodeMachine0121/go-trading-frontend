import { SignalDomain } from '~/domain/models/domains/signal-domain'
import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'
import { TradingStrategyConditionNodeIdVo } from '~/domain/models/vo/trading-strategy-condition-node-id-vo'

/** 剛加上條件卡的一條先收下買入——什麼都不收的一條是一句永遠不成立的話。 */
const DEFAULT_ACCEPTED_SIGNAL = 'buy'

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

/** 一條什麼都不收的條件——它說不出任何一句話，所以照實說它還沒決定。 */
const NO_SIGNAL_WORDS = '（還沒選信號）'

/** 三個信號全收時，那一條其實在說的話。 */
const EVERY_SIGNAL_WORDS = '也就是「不管它說什麼都算」'

/** 一張空的條件卡讀出來的那一行——空的不是一句話，所以照實說還沒有。 */
const EMPTY_READ_OUT = '還沒有任何條件。'

/**
 * Domain Model：一張條件卡上有哪幾條條件，以及所有改得動它的操作。
 *
 * **它不是第二份資料。** 存出去的永遠是條件樹；這個模型只負責在「使用者改得動的形狀」
 * 與「後端收得下的形狀」之間翻譯。兩邊各存一份的話，第二份遲早會說出第一份沒有的話。
 *
 * 每一個操作都回傳一張新的條件卡，沒有任何一個就地改——就地改深處某一格，
 * 正是 Vue 的響應式最容易漏掉的一種更新。
 */
export class ConditionBoardDomain {
  constructor(private readonly board: ConditionBoardDto) {}

  /** 這張條件卡現在的樣子，給下一次操作接著用。要畫在畫面上的那一份是 `toDto()`。 */
  get value(): ConditionBoardDto {
    return this.board
  }

  /**
   * 這張條件卡讀成畫面要的樣子：每一條、每一格、整張各自讀成一句話。
   *
   * 讀法全部住在這裡——「等於」、信號之間的「或」、格與格之間的且／或、
   * 一組旁邊還有別的格時才加的括號、一條都沒有時那一行說什麼。畫面只把這些字排出來。
   */
  toDto(): ConditionBoardDto {
    const items = this.board.items.map((item) => {
      const pieces = item.pieces.map((piece) => {
        const isUndecided = piece.acceptedSignals.length === 0
        const signalWords = isUndecided
          ? NO_SIGNAL_WORDS
          // 幾個信號之間是「其中之一」，所以連起來的字是「或」。
          : piece.acceptedSignals.map(signal => new SignalDomain(signal).label()).join('或')
        const excluded = SIGNAL_VALUES.find(signal => !piece.acceptedSignals.includes(signal))
        // **一支策略腳本同一時間只吐一個信號**，所以收了兩個以上時是「其中之一」，
        // 不是「而且」——而並排的開關看起來就像「而且」。使用者會盯著一條「賣出或持有」，
        // 想不通一支策略腳本怎麼可能同時是兩者；翻成「不是買入」他就懂了。
        // 只收一個（或一個都沒收）時沒有任何東西需要解釋。
        const plainWords = piece.acceptedSignals.length < 2
          ? ''
          : piece.acceptedSignals.length === SIGNAL_VALUES.length
            ? EVERY_SIGNAL_WORDS
            : `也就是「不是${excluded === undefined ? '' : new SignalDomain(excluded).label()}」`

        return new ConditionBoardPieceDto(
          piece.sourceLabel,
          piece.acceptedSignals,
          RELATION_WORD,
          signalWords,
          `${piece.sourceLabel} ${RELATION_WORD} ${signalWords}`,
          plainWords,
          isUndecided,
        )
      })
      const joinerWord = item.operator === null ? '' : OPERATOR_WORDS[item.operator]

      return new ConditionBoardItemDto(
        item.operator, pieces, joinerWord, pieces.map(piece => piece.sentence).join(` ${joinerWord} `))
    })
    const joinerWord = OPERATOR_WORDS[this.board.operator]
    // 一組只有在**旁邊還有別的格**時才加上括號：「A 等於 買入 且（B 等於 買入 或 C 等於 買入）」。
    // 整張只有那一組時，括號什麼都沒有分開，只會讓一句話多兩個符號。
    const sentence = items
      .map(item => (item.isBundle && items.length > 1 ? `（${item.sentence}）` : item.sentence))
      .join(` ${joinerWord} `)

    return new ConditionBoardDto(
      this.board.operator,
      items,
      this.board.representable,
      joinerWord,
      RELATION_WORD,
      sentence,
      items.length === 0 ? EMPTY_READ_OUT : sentence,
    )
  }

  /**
   * 把某一條條件的某一個信號打開或關掉。
   *
   * 一條條件收的是一個集合而不是一個值，所以這裡是「切換」而不是「指派」：
   * 「A 是買入或持有都算」是真的有人要說的話。
   */
  toggleSignal(sourceLabel: string, signal: string): ConditionBoardDomain {
    return this.mappingPieces(piece => (piece.sourceLabel === sourceLabel
      ? new ConditionBoardPieceDto(
          piece.sourceLabel,
          piece.acceptedSignals.includes(signal)
            ? piece.acceptedSignals.filter(accepted => accepted !== signal)
            // 順序照著 SIGNAL_VALUES，不是照著按下去的順序——同樣的一條條件
            // 在兩台機器人上要長得一樣。
            : SIGNAL_VALUES.filter(
                candidate => candidate === signal || piece.acceptedSignals.includes(candidate)),
        )
      : piece))
  }

  /** 條件裡某個訊號來源改名之後的樣子。每一條擺在哪裡、收什麼，一樣都不動。 */
  renamed(fromLabel: string, toLabel: string): ConditionBoardDomain {
    return this.mappingPieces(piece => (piece.sourceLabel === fromLabel
      ? new ConditionBoardPieceDto(toLabel, piece.acceptedSignals)
      : piece))
  }

  /** 換掉條件卡上每一格之間怎麼合併。哪幾條擺在哪裡一格都不動。 */
  changeOperator(operator: ConditionOperatorVo): ConditionBoardDomain {
    return new ConditionBoardDomain(
      new ConditionBoardDto(operator, this.board.items, this.board.representable))
  }

  /** 換掉某一組裡面怎麼合併。那一組是由它裝著哪幾條認出來的。 */
  changeBundleOperator(itemKey: string, operator: ConditionOperatorVo): ConditionBoardDomain {
    return new ConditionBoardDomain(new ConditionBoardDto(
      this.board.operator,
      this.board.items.map(item => (item.key === itemKey && item.isBundle
        ? new ConditionBoardItemDto(operator, item.pieces)
        : item)),
      this.board.representable,
    ))
  }

  /**
   * 把指著已經不存在的訊號來源的條件從條件卡上收走。
   *
   * 它**只收不放**：一個新加的訊號來源不會自己變成一條條件——
   * 那是使用者要做的動作，而一條自己跑出來的條件，
   * 會讓他覺得畫面在替他做決定。
   */
  alignedTo(sourceLabels: readonly string[]): ConditionBoardDomain {
    return this.rebuilt(this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => sourceLabels.includes(piece.sourceLabel))))
      .filter(item => item.pieces.length > 0))
  }

  /**
   * 加一條條件：那個訊號來源排到最後面，而且**只收**挑的那一個信號。
   *
   * 它已經在這張卡上的話，是把那一條搬到最後面、改成只收這一個——一個來源在
   * 同一張卡上只出現一次。
   */
  addClause(sourceLabel: string, signal: string): ConditionBoardDomain {
    return this.rebuilt([
      ...this.withoutPiece(sourceLabel),
      new ConditionBoardItemDto(null, [new ConditionBoardPieceDto(
        sourceLabel, SIGNAL_VALUES.filter(candidate => candidate === signal))]),
    ])
  }

  /**
   * 把一條條件排到條件卡的第幾格。已經在卡上就是**換位置**，不是複製。
   */
  placeAt(sourceLabel: string, position: number): ConditionBoardDomain {
    const carried = this.pieceOf(sourceLabel)
    const without = this.withoutPiece(sourceLabel)
    const landing = Math.max(0, Math.min(position, without.length))

    return this.rebuilt([
      ...without.slice(0, landing),
      new ConditionBoardItemDto(null, [carried]),
      ...without.slice(landing),
    ])
  }

  /**
   * 把一條條件扣到另一條（或另一組）上，變成一組。
   *
   * 這是條件卡上唯一造得出巢狀的動作，也是「A 而且（B 或 C）」唯一的寫法。
   * 一組預設用「或」合併，因為條件卡本身多半是「全部成立」——
   * 扣在一起的那幾條如果也是「全部成立」，那一組就沒有存在的必要。
   *
   * 扣到自己身上、或扣到自己已經在的那一組上，都是什麼都不做。
   */
  bundleOnto(sourceLabel: string, targetLabel: string): ConditionBoardDomain {
    const target = this.board.items.find(item => item.holdsLabels.includes(targetLabel))
    if (target === undefined || target.holdsLabels.includes(sourceLabel)) {
      return this
    }

    // 一組裡面不會再有一組：扣過來的如果自己是一組，就整組攤進去。
    const carriedPieces = this.board.items
      .find(item => item.holdsLabels.includes(sourceLabel))?.pieces
      .filter(piece => piece.sourceLabel === sourceLabel) ?? [this.pieceOf(sourceLabel)]

    return this.rebuilt(this.withoutPiece(sourceLabel).map(item => (item.key === target.key
      ? new ConditionBoardItemDto(item.operator ?? 'or', [...item.pieces, ...carriedPieces])
      : item)))
  }

  /**
   * 把一條單獨的條件和另一格（由它的 key 認出來）扣成一組。
   *
   * 另一格是單獨一條時，是**把它拉過來**：這一條留在原地、排在前面，
   * 讀起來就是使用者心裡那一句（「突破 等於 買入 或 動能 等於 買入」）。
   * 另一格已經是一組時，是把這一條加進那一組——一組不能被拉進一條裡。
   */
  bundleWith(sourceLabel: string, targetKey: string): ConditionBoardDomain {
    const target = this.board.items.find(item => item.key === targetKey)
    const targetLabel = target?.holdsLabels[0]
    if (target === undefined || targetLabel === undefined) {
      return this
    }

    return target.isBundle
      ? this.bundleOnto(sourceLabel, targetLabel)
      : this.bundleOnto(targetLabel, sourceLabel)
  }

  /** 把一條條件從一組裡拆出來，放回它自己一格，就排在那一組後面。 */
  unbundle(sourceLabel: string): ConditionBoardDomain {
    const holder = this.board.items.find(item => item.holdsLabels.includes(sourceLabel))
    if (holder === undefined || !holder.isBundle) {
      return this
    }

    const position = this.board.items.indexOf(holder) + 1

    return this.placeAt(sourceLabel, position)
  }

  /** 把一整組拆開，回到一條一條，就在那一組原本的位置、順序不變。 */
  splitBundle(itemKey: string): ConditionBoardDomain {
    return this.rebuilt(this.board.items.flatMap(item => (item.key === itemKey
      ? item.pieces.map(piece => new ConditionBoardItemDto(null, [piece]))
      : [item])))
  }

  /** 把一條條件從這張條件卡上拿掉。那個訊號來源還在，不是被刪掉。 */
  takeOff(sourceLabel: string): ConditionBoardDomain {
    return this.rebuilt(this.withoutPiece(sourceLabel))
  }

  /**
   * 這張條件卡寫成後端收得下的那棵樹。一條條件都沒有時回 `null`。
   *
   * 一條條件收好幾個信號時，它自己是一個「或」；一組是它自己那個運算子的群組。
   * 只有一格時不多包一層：一個只有一種可能的巢狀，存進去之後讀回來會變成另一個形狀，
   * 而那會讓「存進去的與讀出來的一樣」不再成立。
   */
  toCondition(): TradingStrategyConditionDto | null {
    // 一條什麼都不收的條件寫不出任何一句話，所以它不算數——使用者把最後一個信號
    // 也關掉時，那一條就等於還沒決定，而不是「決定了一件不可能的事」。
    const clauses = this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => piece.acceptedSignals.length > 0)))
      .filter(item => item.pieces.length > 0)
      .map(item => item.toCondition())

    if (clauses.length === 0) {
      return null
    }

    if (clauses.length === 1) {
      return clauses[0]!
    }

    return new TradingStrategyConditionDto(
      new TradingStrategyConditionNodeIdVo().value, this.board.operator, clauses, '', '')
  }

  /** 這一條條件現在的樣子；還不在卡上的話就是一條新的，先收下買入。 */
  private pieceOf(sourceLabel: string): ConditionBoardPieceDto {
    return this.board.items
      .flatMap(item => item.pieces)
      .find(piece => piece.sourceLabel === sourceLabel)
      ?? new ConditionBoardPieceDto(sourceLabel, [DEFAULT_ACCEPTED_SIGNAL])
  }

  /** 條件卡上拿掉這一條之後剩下的那幾格。空掉的那一組跟著消失。 */
  private withoutPiece(sourceLabel: string): ConditionBoardItemDto[] {
    return this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => piece.sourceLabel !== sourceLabel)))
      .filter(item => item.pieces.length > 0)
  }

  /**
   * 收拾過的條件卡：只剩一條的組自己散開。
   *
   * 一個裝著一條的「組」與那一條本身**說的是同一句話**，但它多一層框、多一個運算子
   * 選單，而那個選單改了什麼都不會發生。留著它，使用者會以為自己漏看了什麼。
   */
  private rebuilt(items: readonly ConditionBoardItemDto[]): ConditionBoardDomain {
    return new ConditionBoardDomain(new ConditionBoardDto(
      this.board.operator,
      items.map(item => (item.isBundle && item.pieces.length === 1
        ? new ConditionBoardItemDto(null, item.pieces)
        : item)),
      this.board.representable,
    ))
  }

  private mappingPieces(
    transform: (piece: ConditionBoardPieceDto) => ConditionBoardPieceDto,
  ): ConditionBoardDomain {
    return new ConditionBoardDomain(new ConditionBoardDto(
      this.board.operator,
      this.board.items.map(
        item => new ConditionBoardItemDto(item.operator, item.pieces.map(transform))),
      this.board.representable,
    ))
  }
}
