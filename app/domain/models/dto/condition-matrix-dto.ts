import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

/**
 * DTO：墊子上的一塊零件——它是哪一支策略，以及它要是哪幾個信號才算數。
 *
 * `acceptedSignals` 是一個**集合**而不是一個值，因為「A 是買入或持有都算」是真的有人
 * 要說的話。空集合是一塊擺著卻什麼都不收的零件，也就是一句永遠不成立的話——
 * 所以擺上去的零件一定至少收一個。
 */
export class ConditionMatrixPieceDto {
  constructor(
    public readonly sourceLabel: string,
    public readonly acceptedSignals: readonly string[],
  ) {}
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
export class ConditionMatrixItemDto {
  constructor(
    /** 一組零件怎麼合併它裡面那幾塊。單獨一塊時為 `null`。 */
    public readonly operator: ConditionOperatorVo | null,
    public readonly pieces: readonly ConditionMatrixPieceDto[],
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
export class ConditionMatrixDto {
  constructor(
    /** 墊子上每一格之間怎麼合併。 */
    public readonly operator: ConditionOperatorVo,
    public readonly items: readonly ConditionMatrixItemDto[],
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
}
