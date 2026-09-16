import type { ConditionOperatorVo } from '~/domain/models/vo/condition-operator-vo'

/**
 * DTO：矩陣上的一列——一個信號來源，以及它要是哪幾個信號才算數。
 *
 * `acceptedSignals` 是一個**集合**而不是一個值，因為「A 是買入或持有都算」是真的有人
 * 要說的話。空集合代表這一列**不參與**這一邊的判斷，而那與「它必須是某個值」
 * 是兩件完全不同的事——用一個「不管」的選項混在同一個下拉裡，
 * 使用者會以為那是第四種信號。
 */
export class ConditionMatrixRowDto {
  constructor(
    public readonly sourceLabel: string,
    public readonly acceptedSignals: readonly string[],
  ) {}

  /** 這一列有沒有參與判斷。 */
  get participates(): boolean {
    return this.acceptedSignals.length > 0
  }
}

/**
 * DTO：一整邊的判斷，畫成一張表。
 *
 * 它是條件樹的另一種說法，而不是另一份資料：存出去的仍然是那棵樹。
 * 矩陣說得出來的形狀是「每個來源各出一句（或幾句同來源的句子），
 * 整體用且或或串起來」——那涵蓋了實際會寫的絕大多數條件，
 * 而它換來的是**一張表，沒有空位、沒有拖拉、沒有巢狀**。
 *
 * 說不出來的那幾種（且與或交錯的巢狀）不會被硬塞進來：`representable` 為 false 時
 * 畫面照實說，而不是默默把它壓平成一個意思不同的條件。
 */
export class ConditionMatrixDto {
  constructor(
    /** 每一列之間怎麼合併。 */
    public readonly operator: ConditionOperatorVo,
    public readonly rows: readonly ConditionMatrixRowDto[],
    /**
     * 這棵樹畫不畫得成一張表。
     *
     * 畫不成時 `rows` 仍然照實反映它讀得懂的部分，但畫面必須說出來——
     * 使用者存下去會換掉一個他沒看懂的條件。
     */
    public readonly representable: boolean,
  ) {}

  /** 有沒有任何一列參與判斷。一列都沒有就是「這一邊還沒設定」。 */
  get isEmpty(): boolean {
    return !this.rows.some(row => row.participates)
  }
}
