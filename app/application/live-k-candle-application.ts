import type { LiveKCandleService } from '~/domain/service/live-k-candle-service'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'

/** Application：即時跟盤的用例編排，全程只碰 DTO。 */
export class LiveKCandleApplication {
  constructor(private readonly liveKCandleService: LiveKCandleService) {}

  followKCandles(
    symbol: string,
    chart: KCandleChartDto,
    onReport: (report: LiveKCandleReportDto) => void,
  ): () => void {
    return this.liveKCandleService.followKCandles(symbol, chart, onReport)
  }
}
