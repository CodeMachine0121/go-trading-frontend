import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'

/**
 * DTO：正在跟的那一檔，畫面能對它做的兩件事。
 *
 * - `stop`：不跟了。
 * - `rebaseOnto`：手上那一批接上了一段——換成新的那一批繼續跟，
 *   **已經收到的即時 K 線不丟**，回傳併好之後要畫的那一張。
 *   換一張圖（換標的、換粗細、整批換）不走這裡，那是停掉再重新開始跟。
 */
export class LiveKCandleFollowingDto {
  constructor(
    public readonly stop: () => void,
    public readonly rebaseOnto: (chart: KCandleChartDto) => KCandleChartDto,
  ) {}
}
