import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * DTO：問完「我在看這一段，手上有這些」之後拿回來的答案。
 *
 * **兩件事永遠一起回答**，因為它們可以各自獨立發生：
 * - `visibleStartTime` / `visibleEndTime` 是使用者**應該**看到的那一段。
 *   它可能與問的時候不一樣——拉得比最粗的刻度所能涵蓋的還遠時會被收回上限。
 *   畫面一律照它擺位置。
 * - `reloadedChart` 是新取回的那一批；**`null` 代表手上那批就夠了**，畫面不必換資料。
 *
 * 先前這裡只回 `KCandleChartDto | null`，於是「不必重新取」的情況下畫面收不到任何東西，
 * 連「該把位置擺到哪裡」都不知道——按下快捷區間看起來就像壞掉。
 */
export class KCandleChartViewDto {
  constructor(
    public readonly visibleStartTime: Date,
    public readonly visibleEndTime: Date,
    public readonly reloadedChart: KCandleChartDto | null,
  ) {}
}
