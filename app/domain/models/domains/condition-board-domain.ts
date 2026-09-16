import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import { StrategyBotConditionDto } from '~/domain/models/dto/strategy-bot-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'
import { StrategyBotConditionNodeIdVo } from '~/domain/models/vo/strategy-bot-condition-node-id-vo'

/** 剛擺上墊子的零件先收下買入——什麼都不收的零件是一句永遠不成立的話。 */
const DEFAULT_ACCEPTED_SIGNAL = 'buy'

/**
 * Domain Model：一張墊子上擺了什麼，以及所有搬得動它的操作。
 *
 * **它不是第二份資料。** 存出去的永遠是條件樹；這個模型只負責在「使用者搬得動的形狀」
 * 與「後端收得下的形狀」之間翻譯。兩邊各存一份的話，第二份遲早會說出第一份沒有的話。
 *
 * 每一個操作都回傳一張新的墊子，沒有任何一個就地改——就地改深處某一格，
 * 正是 Vue 的響應式最容易漏掉的一種更新。
 */
export class ConditionBoardDomain {
  constructor(private readonly board: ConditionBoardDto) {}

  get value(): ConditionBoardDto {
    return this.board
  }

  /** 這塊零件在不在這張墊子上，不分它在哪一格。 */
  holds(sourceLabel: string): boolean {
    return this.board.placedLabels.includes(sourceLabel)
  }

  /**
   * 把某一塊零件的某一個信號打開或關掉。
   *
   * 一塊零件收的是一個集合而不是一個值，所以這裡是「切換」而不是「指派」：
   * 「A 是買入或持有都算」是真的有人要說的話。
   */
  toggleSignal(sourceLabel: string, signal: string): ConditionBoardDomain {
    return this.mappingPieces(piece => (piece.sourceLabel === sourceLabel
      ? new ConditionBoardPieceDto(
          piece.sourceLabel,
          piece.acceptedSignals.includes(signal)
            ? piece.acceptedSignals.filter(accepted => accepted !== signal)
            // 順序照著 SIGNAL_VALUES，不是照著按下去的順序——同樣的一塊零件
            // 在兩台機器人上要長得一樣。
            : SIGNAL_VALUES.filter(
                candidate => candidate === signal || piece.acceptedSignals.includes(candidate)),
        )
      : piece))
  }

  /** 換掉墊子上每一格之間怎麼合併。哪幾塊擺在哪裡一格都不動。 */
  changeOperator(operator: ConditionOperatorVo): ConditionBoardDomain {
    return new ConditionBoardDomain(
      new ConditionBoardDto(operator, this.board.items, this.board.representable))
  }

  /** 換掉某一組零件裡面怎麼合併。那一組是由它裝著哪幾塊認出來的。 */
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
   * 把已經不存在的零件從墊子上收走。
   *
   * 它**只收不放**：一塊新加的零件待在架子上，不會自己跳到墊子上——
   * 那是使用者要做的動作，而一個自己跑到工作區的零件，
   * 會讓他覺得畫面在替他做決定。
   */
  alignedTo(sourceLabels: readonly string[]): ConditionBoardDomain {
    return this.rebuilt(this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => sourceLabels.includes(piece.sourceLabel))))
      .filter(item => item.pieces.length > 0))
  }

  /**
   * 把一塊零件擺上墊子的第幾格。已經在墊子上就是**搬位置**，不是複製。
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
   * 把一塊零件扣到另一塊（或另一組）上，變成一組。
   *
   * 這是墊子上唯一造得出巢狀的動作，也是「A 而且（B 或 C）」唯一的寫法。
   * 一組預設用「或」合併，因為墊子本身多半是「全部成立」——
   * 扣在一起的那幾塊如果也是「全部成立」，那一組就沒有存在的必要。
   *
   * 扣到自己身上、或扣到自己已經在的那一組上，都是什麼都不做。
   */
  bundleOnto(sourceLabel: string, targetLabel: string): ConditionBoardDomain {
    const target = this.board.items.find(item => item.holdsLabels.includes(targetLabel))
    if (target === undefined || target.holdsLabels.includes(sourceLabel)) {
      return this
    }

    // 一組裡面不會再有一組：被拖過來的如果自己是一組，就整組攤進去。
    const carriedPieces = this.board.items
      .find(item => item.holdsLabels.includes(sourceLabel))?.pieces
      .filter(piece => piece.sourceLabel === sourceLabel) ?? [this.pieceOf(sourceLabel)]

    return this.rebuilt(this.withoutPiece(sourceLabel).map(item => (item.key === target.key
      ? new ConditionBoardItemDto(item.operator ?? 'or', [...item.pieces, ...carriedPieces])
      : item)))
  }

  /** 把一塊零件從一組裡拆出來，放回它自己一格。 */
  unbundle(sourceLabel: string): ConditionBoardDomain {
    const holder = this.board.items.find(item => item.holdsLabels.includes(sourceLabel))
    if (holder === undefined || !holder.isBundle) {
      return this
    }

    const position = this.board.items.indexOf(holder) + 1

    return this.placeAt(sourceLabel, position)
  }

  /** 把一塊零件從這張墊子上拿走。它回到架子上，不是被刪掉。 */
  takeOff(sourceLabel: string): ConditionBoardDomain {
    return this.rebuilt(this.withoutPiece(sourceLabel))
  }

  /**
   * 這張墊子寫成後端收得下的那棵樹。墊子上一塊零件都沒有時回 `null`。
   *
   * 一塊零件收好幾個信號時，它自己是一個「或」；一組零件是它自己那個運算子的群組。
   * 只有一格時不多包一層：一個只有一種可能的巢狀，存進去之後讀回來會變成另一個形狀，
   * 而那會讓「存進去的與讀出來的一樣」不再成立。
   */
  toCondition(): StrategyBotConditionDto | null {
    // 一塊什麼都不收的零件寫不出任何一句話，所以它不算數——使用者把最後一個信號
    // 也關掉時，那一塊就等於還沒決定，而不是「決定了一件不可能的事」。
    const clauses = this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => piece.acceptedSignals.length > 0)))
      .filter(item => item.pieces.length > 0)
      .map(item => this.clauseFor(item))

    if (clauses.length === 0) {
      return null
    }

    if (clauses.length === 1) {
      return clauses[0]!
    }

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, this.board.operator, clauses, '', '')
  }

  private clauseFor(item: ConditionBoardItemDto): StrategyBotConditionDto {
    const pieceClauses = item.pieces.map(piece => this.clauseForPiece(piece))

    if (pieceClauses.length === 1) {
      return pieceClauses[0]!
    }

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, item.operator ?? 'or', pieceClauses, '', '')
  }

  private clauseForPiece(piece: ConditionBoardPieceDto): StrategyBotConditionDto {
    const comparisons = piece.acceptedSignals.map(signal => new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, null, [], piece.sourceLabel, signal))

    if (comparisons.length === 1) {
      return comparisons[0]!
    }

    return new StrategyBotConditionDto(
      new StrategyBotConditionNodeIdVo().value, 'or', comparisons, '', '')
  }

  /** 這塊零件現在的樣子；還沒擺上墊子的話就是一塊新的。 */
  private pieceOf(sourceLabel: string): ConditionBoardPieceDto {
    return this.board.items
      .flatMap(item => item.pieces)
      .find(piece => piece.sourceLabel === sourceLabel)
      ?? new ConditionBoardPieceDto(sourceLabel, [DEFAULT_ACCEPTED_SIGNAL])
  }

  /** 墊子上拿掉這塊零件之後剩下的那幾格。空掉的那一組跟著消失。 */
  private withoutPiece(sourceLabel: string): ConditionBoardItemDto[] {
    return this.board.items
      .map(item => new ConditionBoardItemDto(
        item.operator, item.pieces.filter(piece => piece.sourceLabel !== sourceLabel)))
      .filter(item => item.pieces.length > 0)
  }

  /**
   * 收拾過的墊子：只剩一塊的組自己散開。
   *
   * 一個裝著一塊的「組」與那一塊本身**說的是同一句話**，但它多一層框、多一個運算子
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
