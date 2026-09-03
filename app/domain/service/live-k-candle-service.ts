import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import { LiveKCandleChartDomain } from '~/domain/models/domains/live-k-candle-chart-domain'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'

/**
 * Domain Service：跟盤的編排。
 *
 * 它跨了兩件事——那條通道，與圖上那批 K 線——所以是編排而不是單一物件的計算。
 * 併進去的算法一行都不在這裡：那屬於持有 K 線的那個 domain model。
 */
export class LiveKCandleService {
  constructor(private readonly liveKCandleProxy: ILiveKCandleProxy) {}

  /**
   * 開始跟一個交易標的，每收到一則就把併好的結果交出去，並回傳怎麼停。
   *
   * 交出去的是一份**報告**而不是一張圖，因為呼叫端需要知道的不只是圖變成什麼樣子，
   * 還有「這一則是不是一根走完了」（要重算指標）與「是不是跟不動了」（要明說）。
   * 讓呼叫端自己從圖去推這兩件事是推不出來的。
   */
  followKCandles(
    symbol: string,
    chart: KCandleChartDto,
    onReport: (report: LiveKCandleReportDto) => void,
  ): () => void {
    let liveChart = new LiveKCandleChartDomain(chart)

    return this.liveKCandleProxy.followKCandles(symbol, (update) => {
      liveChart = liveChart.applying(update)

      onReport(new LiveKCandleReportDto(
        liveChart.toChartDto(),
        update.status === 'closed',
        update.status === 'stalled',
      ))
    })
  }
}
