import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { DrawnKCandleRangeVo } from '~/domain/models/vo/drawn-k-candle-range-vo'

/**
 * DTO：問完「我在看這一段，手上有這些」之後拿回來的答案。
 *
 * **三件事永遠一起回答**，因為它們可以各自獨立發生：
 * - `visibleStartTime` / `visibleEndTime` 是使用者**應該**看到的那一段。
 *   它可能與問的時候不一樣——拉得比最粗的刻度所能涵蓋的還遠時會被收回上限。
 *   畫面一律照它擺位置。
 * - `reloadedChart` 是新取回的那一批；**`null` 代表手上那批就夠了**，畫面不必換資料。
 * - `drawnRange` 是圖上**實際**要畫的那一段（從第幾根到第幾根）。它與上面那一對的差別
 *   正是**右側留白**：使用者看得到最新那一根時，畫出來的那一段會比他要求的那一段
 *   多出一成的寬度，而那一成落在最後一根之後，沒有任何時刻指得到它。
 *   一根都沒有時是 `null`——那樣的圖談不上要從第幾根畫到第幾根。
 *
 * **三件事必須在同一個答案裡。** 眼睛看到的那一段（`drawnRange`）與下一次拿去要資料的
 * 那一段（`visibleStartTime` / `visibleEndTime`）分兩次回答，就會有一次它們不同步——
 * 而不同步的那一次，畫面會停在一個沒有人要求過的位置。
 *
 * 先前這裡只回 `KCandleChartDto | null`，於是「不必重新取」的情況下畫面收不到任何東西，
 * 連「該把位置擺到哪裡」都不知道——按下快捷區間看起來就像壞掉。
 */
export class KCandleChartViewDto {
  constructor(
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    public readonly reloadedChart: KCandleChartDto | null,
    public readonly drawnRange: DrawnKCandleRangeVo | null,
  ) {}
}
