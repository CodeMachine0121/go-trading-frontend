import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import { TradingStrategyConditionNodeIdVo } from '~/domain/models/vo/trading-strategy-condition-node-id-vo'

/**
 * DTO：條件卡上的一條條件——它看的是哪一個訊號來源，以及那個來源要是哪幾個信號才算數。
 *
 * `acceptedSignals` 是一個**集合**而不是一個值，因為「A 是買入或持有都算」是真的有人
 * 要說的話。空集合是一條擺著卻什麼都不收的條件，也就是一句永遠不成立的話。
 *
 * 讀成一句話的那幾個字（`relationWord`、`signalWords`、`sentence`、`plainWords`、
 * `isUndecided`）是 ConditionBoardDomain 的 `toDto()` 說好的，這裡只是帶著它們。
 * 由條件樹剛讀出來、還沒經過 `toDto()` 的那一份只有前兩欄，其餘是空的。
 */
export class ConditionBoardPieceDto {
  constructor(
    public readonly sourceLabel: string,
    public readonly acceptedSignals: readonly string[],
    /** 「等於」——信號比對唯一的那一種關係。 */
    public readonly relationWord = '',
    /** 它收的那幾個信號讀成一段話：「買入」「買入或持有」。 */
    public readonly signalWords = '',
    /** 這一條讀成一句話：「突破 等於 買入」。 */
    public readonly sentence = '',
    /** 收了兩個以上信號時，它其實在說什麼（「也就是『不是買入』」）；沒什麼要解釋時是空字串。 */
    public readonly plainWords = '',
    /** 一個信號都沒收——這一條還沒決定。 */
    public readonly isUndecided = false,
  ) {}

  /** 這一條寫成條件樹：收一個信號是一句比對，收好幾個是它們的「或」。 */
  toCondition(): TradingStrategyConditionDto {
    const comparisons = this.acceptedSignals.map(signal => new TradingStrategyConditionDto(
      new TradingStrategyConditionNodeIdVo().value, null, [], this.sourceLabel, signal))

    if (comparisons.length === 1) {
      return comparisons[0]!
    }

    return new TradingStrategyConditionDto(
      new TradingStrategyConditionNodeIdVo().value, 'or', comparisons, '', '')
  }
}

/**
 * DTO：條件卡上的一格——一條條件，或**扣在一起的一組**。
 *
 * 一組是為了說得出「A 而且（B 或 C）」。沒有它的話，一張條件卡只說得出
 * 「這幾條全部成立」或「這幾條任一成立」，中間那種混著的就永遠寫不出來。
 *
 * `operator` 有值就是一組，沒有就是單獨一條——與條件樹用同一個分辨方式，
 * 因為它們本來就是同一件事的兩種形狀。**一組裡面不會再有一組**：
 * 三層以上的巢狀在實際的條件裡幾乎不出現，而它會讓「把一條扣到另一條上」
 * 這個動作變得沒有人說得準結果。
 */
export class ConditionBoardItemDto {
  constructor(
    /** 一組怎麼合併它裡面那幾條。單獨一條時為 `null`。 */
    public readonly operator: ConditionOperatorVo | null,
    public readonly pieces: readonly ConditionBoardPieceDto[],
    /** 一組裡面那幾句之間的連接詞；單獨一條時沒有。 */
    public readonly joinerWord = '',
    /** 這一格讀成一句話：「突破 等於 買入 或 動能 等於 買入」。 */
    public readonly sentence = '',
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

  /** 這一格寫成條件樹：單獨一條就是那一條，一組是它自己那個運算子的群組。 */
  toCondition(): TradingStrategyConditionDto {
    const pieceClauses = this.pieces.map(piece => piece.toCondition())

    if (pieceClauses.length === 1) {
      return pieceClauses[0]!
    }

    return new TradingStrategyConditionDto(
      new TradingStrategyConditionNodeIdVo().value, this.operator ?? 'or', pieceClauses, '', '')
  }
}

/**
 * DTO：一整邊的判斷，畫成一張條件卡上有哪幾條條件。
 *
 * 它是條件樹的另一種說法，而不是另一份資料：存出去的仍然是那棵樹。
 * 條件卡說得出來的形狀是「幾格用且或或串起來，其中一格可以是一組」——
 * 也就是兩層。那涵蓋了實際會寫的絕大多數條件。
 *
 * 說不出來的（三層以上、或組裡還有組）不會被硬塞進來：`representable` 為 false 時
 * 畫面照實說，而不是默默把它壓平成一個意思不同的條件。
 */
export class ConditionBoardDto {
  constructor(
    /** 條件卡上每一格之間怎麼合併。 */
    public readonly operator: ConditionOperatorVo,
    public readonly items: readonly ConditionBoardItemDto[],
    public readonly representable: boolean,
    /** 格與格之間的連接詞。 */
    public readonly joinerWord = '',
    /** 「等於」——加一條條件時，來源與信號之間的那個字。 */
    public readonly relationWord = '',
    /** 整張讀成一句話；一張空的是空字串。 */
    public readonly sentence = '',
    /** 設定裡那一行讀出來的字：有條件時就是那一句，空的時候照實說還沒有。 */
    public readonly readOut = '',
  ) {}

  /** 條件卡上一條條件都沒有。 */
  get isEmpty(): boolean {
    return this.items.length === 0
  }

  /** 條件卡上用著的每一個訊號來源，不分它在哪一格。 */
  get placedLabels(): readonly string[] {
    return this.items.flatMap(item => item.holdsLabels)
  }
}
