import {
  ConditionBoardDto,
  ConditionBoardItemDto,
  ConditionBoardPieceDto,
} from '~/domain/models/dto/condition-board-dto'
import type { TradingStrategyConditionDto } from '~/domain/models/dto/trading-strategy-condition-dto'
import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'
import { SIGNAL_VALUES } from '~/domain/models/vo/signal-vo'

/**
 * Domain Model：一棵存起來的條件樹。
 *
 * 它現在**只做一件事：把樹讀成一張表**。編輯不在這裡發生——使用者改的是表
 * （見 ConditionBoardDomain），送出去時再由表寫回一棵樹。
 *
 * 之前這裡有一整套「在某個節點底下加一句、把一句包成群組、某個洞收不收某一塊」的
 * 操作，那是為了一個由積木與空位組成的畫面。那個畫面被一張表取代了，
 * 而那些操作跟著整批消失——**沒有人在用的能力留著，下一個人會以為它還有意義**。
 */
export class TradingStrategyConditionDomain {
  constructor(private readonly condition: TradingStrategyConditionDto | null) {}

  get value(): TradingStrategyConditionDto | null {
    return this.condition
  }

  /** 空的樹是「還沒設定」，不是一種合法的條件——兩邊都不得為空。 */
  get isEmpty(): boolean {
    return this.condition === null
  }

  /**
   * 這棵樹讀成「墊子上擺了什麼」。
   *
   * 讀得出來的形狀是**兩層**：墊子上幾格用同一個運算子串起來，其中一格可以是一小組。
   * 那涵蓋了實際會寫的絕大多數條件，包括「A 而且（B 或 C）」。
   *
   * 三層以上、或組裡還有組的，**不硬壓平**：壓平會得到一個意思不同的條件，
   * 而使用者會在完全沒察覺的情況下把它存回去。`representable` 為 false，畫面照實說。
   */
  toBoardDto(): ConditionBoardDto {
    if (this.condition === null) {
      return new ConditionBoardDto('and', [], true)
    }

    // 一句比對自己就是墊子上一塊零件；用哪個運算子都一樣。
    if (!this.condition.isGroup) {
      return new ConditionBoardDto('and', [this.itemFrom([this.condition])!], true)
    }

    const items = this.itemsFrom(this.condition)

    return items === null
      ? new ConditionBoardDto(this.condition.operator!, [], false)
      : new ConditionBoardDto(this.condition.operator!, items, true)
  }

  /** 墊子上的每一格——讀不出來時回 `null`。 */
  private itemsFrom(group: TradingStrategyConditionDto): ConditionBoardItemDto[] | null {
    const operator = group.operator!
    const items: ConditionBoardItemDto[] = []

    for (const child of group.conditions) {
      if (!child.isGroup) {
        // 同一塊零件的好幾句要併回同一格：`或(A=買, A=持)` 說的是
        // **一塊零件收兩個信號**，不是兩塊零件。併進**第一次**出現的那一格，
        // 順序才跟樹上一樣——而那個順序正是使用者在墊子上排出來的。
        const existing = items.findIndex(
          item => !item.isBundle && item.pieces[0]!.sourceLabel === child.sourceLabel)

        if (existing === -1) {
          items.push(this.itemFrom([child])!)
        }
        else {
          items[existing] = this.withSignalAdded(items[existing]!, child.signal)
        }

        continue
      }

      // 同一個運算子的子群組與外面那一層說的是同一句話（`A且(B且C)` ＝ `A且B且C`），
      // 所以它攤開來，不是一組。
      if (child.operator === operator) {
        const deeper = this.itemsFrom(child)
        if (deeper === null) {
          return null
        }
        items.push(...deeper)

        continue
      }

      // 運算子不同的子群組：裡面只能是比對，不能再有一層。
      if (child.conditions.some(grandchild => grandchild.isGroup)) {
        return null
      }

      const item = this.itemFrom(child.conditions, child.operator)
      if (item === null) {
        return null
      }
      items.push(item)
    }

    return items
  }

  /**
   * 這一格那塊零件再多收一個信號。
   *
   * 順序照著固定的那一份，不是照著樹裡出現的順序——
   * 同樣的一塊零件在兩台機器人上要長得一樣。
   */
  private withSignalAdded(item: ConditionBoardItemDto, signal: string): ConditionBoardItemDto {
    const piece = item.pieces[0]!

    return new ConditionBoardItemDto(null, [new ConditionBoardPieceDto(
      piece.sourceLabel,
      SIGNAL_VALUES.filter(
        candidate => candidate === signal || piece.acceptedSignals.includes(candidate)),
    )])
  }

  /**
   * 一排比對讀成墊子上的一格。
   *
   * 同一塊零件的好幾句收成那一塊收的好幾個信號；不同零件的好幾句就是一組。
   * **只提到一塊零件的那一組不是一組**——它就是那一塊，收了好幾個信號。
   */
  private itemFrom(
    comparisons: readonly TradingStrategyConditionDto[],
    operator: ConditionOperatorVo | null = null,
  ): ConditionBoardItemDto | null {
    const pieces = this.piecesFrom(comparisons)

    return new ConditionBoardItemDto(pieces.length > 1 ? operator : null, pieces)
  }

  /**
   * 一排比對歸成零件：同一塊零件的好幾句，收成那一塊收的好幾個信號。
   *
   * 信號的順序照著固定的那一份，不是照著樹裡出現的順序——
   * 同樣的一塊零件在兩台機器人上要長得一樣。
   */
  private piecesFrom(
    comparisons: readonly TradingStrategyConditionDto[],
  ): ConditionBoardPieceDto[] {
    const signalsByLabel = new Map<string, string[]>()
    for (const comparison of comparisons) {
      const accepted = signalsByLabel.get(comparison.sourceLabel) ?? []
      if (!accepted.includes(comparison.signal)) {
        accepted.push(comparison.signal)
      }
      signalsByLabel.set(comparison.sourceLabel, accepted)
    }

    return [...signalsByLabel.entries()].map(([label, accepted]) => new ConditionBoardPieceDto(
      label, SIGNAL_VALUES.filter(signal => accepted.includes(signal))))
  }

  /** 這棵樹用到的每一個來源代號。 */
  usedSourceLabels(): readonly string[] {
    return this.collectLabels(this.condition)
  }

  private collectLabels(node: TradingStrategyConditionDto | null): string[] {
    if (node === null) {
      return []
    }

    if (!node.isGroup) {
      return [node.sourceLabel]
    }

    return node.conditions.flatMap(child => this.collectLabels(child))
  }
}
