import type { LiveKCandleService } from '~/domain/service/live-k-candle-service'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { LiveUpdateNoticeVo } from '~/domain/models/vo/live-update-notice-vo'

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

  /**
   * 該對看的人說哪一句話，至多一句。
   *
   * 它是一個獨立的問句而不是跟盤的副產品：進到圖表的那一刻還沒有任何一則更新，
   * 而「這個市場收盤中」在那一刻就該說了。
   */
  liveUpdateNotice(
    tradingSymbol: TradingSymbolDto | null,
    report: LiveKCandleReportDto | null,
  ): LiveUpdateNoticeVo | null {
    return this.liveKCandleService.liveUpdateNotice(tradingSymbol, report)
  }
}
