import type { StrategyDto } from '~/domain/models/dto/strategy-dto'

/**
 * DTO：拿一支策略對**圖上正在畫的那批 K 線**算一次要給的東西。
 *
 * 交易標的、彙總刻度、根數與算到哪一刻全部來自圖表當下畫的那一批——
 * 這是線與 K 線不會錯位的唯一理由。少給任何一樣，算出來的都是另一段行情的指標，
 * 而它畫在圖上看起來完全正常。
 *
 * `takenColorTokens` 是圖上其他線已經用掉的顏色。它在請求裡而不是在領域裡自己算，
 * 因為「圖上現在有哪些線」是畫面的狀態，領域沒有、也不該持有那份清單。
 */
export class ChartIndicatorRequestDto {
  constructor(
    public readonly strategy: StrategyDto,
    public readonly symbol: string,
    public readonly aggregationInterval: string,
    public readonly candleCount: number,
    /**
     * 算到哪一刻。**`null` 是一個答案而不是缺值**——它的意思是「照系統的現在」，
     * 而系統本來就規定未指定即視為現在。整條路上只有一處產生它、一處消費它，
     * 中間每一層都只是搬運。
     */
    public readonly endTime: Date | null,
    public readonly takenColorTokens: readonly string[],
  ) {}
}
