import { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'

/**
 * 往左接上來的空白要累積多長，才算那一頭到底了。
 *
 * 有休市的市場，一段剛好落在休市（一個晚上、一個週末、一個長假）裡也會一根都沒有；
 * 兩週涵蓋得了最長的連假，又不會讓真的到底時一直白問下去。
 */
const EARLIEST_EMPTY_SPAN_MILLISECONDS = 14 * 24 * 60 * 60 * 1000

/**
 * Domain Model：手上這批，加上在它左邊或右邊接上來的一段。
 *
 * 兩批在交界處可能各有同一根（後端的區間兩端都算），所以依起始時間去重——
 * **同一根以接上來的那一段為準**：它是比較晚才取的，還在走的那一根它看到的比較新。
 *
 * 接上來的是左邊那一段、而它一根都沒有時，可能是那一頭已經沒有更早的資料，
 * 也可能只是剛好落在休市裡——接連空了夠久才記成到底，之後再往那邊拖就不必再去要。
 */
export class KCandleChartMergeDomain {
  constructor(
    private readonly loadedChart: KCandleChartDto,
    private readonly extensionChart: KCandleChartDto,
  ) {}

  toDto(): KCandleChartDto {
    const extendsEarlier
      = this.extensionChart.coveredEndTime.getTime() <= this.loadedChart.coveredStartTime.getTime()

    // 往左空了就累積，往左接到東西就歸零；往右接不影響左邊。
    const emptyEarlierSpanMilliseconds = !extendsEarlier
      ? this.loadedChart.emptyEarlierSpanMilliseconds
      : this.extensionChart.isEmpty
        ? this.loadedChart.emptyEarlierSpanMilliseconds + this.extensionChart.coveredSpanMilliseconds
        : 0

    const byOpenTime = new Map<number, KCandleDto>()
    for (const kCandleDto of [...this.loadedChart.kCandles, ...this.extensionChart.kCandles]) {
      byOpenTime.set(kCandleDto.openTime.getTime(), kCandleDto)
    }

    return new KCandleChartDto(
      this.loadedChart.symbol,
      this.loadedChart.interval,
      new Date(Math.min(
        this.loadedChart.coveredStartTime.getTime(), this.extensionChart.coveredStartTime.getTime())),
      new Date(Math.max(
        this.loadedChart.coveredEndTime.getTime(), this.extensionChart.coveredEndTime.getTime())),
      [...byOpenTime.values()].sort(
        (earlier, later) => earlier.openTime.getTime() - later.openTime.getTime()),
      this.loadedChart.aggregationIntervalChoice,
      // 合約的三條價格線說的是最新那一根，所以只有往右接上來的一段帶來的才比較新。
      extendsEarlier
        ? this.loadedChart.latestContractPrices
        : this.extensionChart.latestContractPrices ?? this.loadedChart.latestContractPrices,
      this.loadedChart.reachedEarliest || emptyEarlierSpanMilliseconds >= EARLIEST_EMPTY_SPAN_MILLISECONDS,
      emptyEarlierSpanMilliseconds,
    )
  }
}
