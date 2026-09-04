/**
 * VO：圖上目前畫著哪些線。不可變、無行為以外的狀態。
 *
 * 兩份資料合成一個概念，因為它們來自同一個地方（圖上其他線），也永遠一起變：
 * 分成兩個參數傳，第三個關於「圖上有什麼」的問題出現時就會變成第三個參數，
 * 而它們其實是同一件事的三個面。
 *
 * **記憶身分（`drawnLineKeys`）是這個切片才需要的那一份。**
 * 同一支策略被套用兩次時，兩次畫的是**同一條線**——它們的記憶身分一模一樣，
 * 於是都會去拿同一個記住的顏色，兩條線同色。這份清單讓配色答得出
 * 「這條線已經在圖上了」，而那正是唯一該跳過記憶的情況。
 */
export class DrawnChartLinesVo {
  constructor(
    /** 配色時要避開的顏色。 */
    public readonly takenColorTokens: readonly string[] = [],
    /** 已經在圖上的那幾條線的記憶身分。 */
    public readonly drawnLineKeys: readonly string[] = [],
  ) {}

  /** 這條線是不是已經有一條在圖上了。 */
  alreadyDraws(lineKey: string): boolean {
    return this.drawnLineKeys.includes(lineKey)
  }
}
