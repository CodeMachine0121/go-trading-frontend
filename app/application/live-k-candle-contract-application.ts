import type { LiveKCandleService } from '~/domain/service/live-k-candle-service'
import type { KCandleChartDto } from '~/domain/models/dto/k-candle-chart-dto'
import type { LiveKCandleReportDto } from '~/domain/models/dto/live-k-candle-report-dto'
import type { ContractTradingSymbolDto } from '~/domain/models/dto/contract-trading-symbol-dto'
import type { LiveUpdateNoticeVo } from '~/domain/models/vo/live-update-notice-vo'

/**
 * Application：合約圖表的即時跟盤用例，全程只碰 DTO。
 *
 * 它拿到的 service 是以**合約那一條通道**組起來的——現貨與合約各跟各的，
 * 同一個代號在兩邊互不影響。併入最新那一根的規則與提示的優先序都是現貨那一份。
 */
export class LiveKCandleContractApplication {
  constructor(private readonly liveKCandleService: LiveKCandleService) {}

  followKCandles(
    symbol: string,
    chart: KCandleChartDto,
    onReport: (report: LiveKCandleReportDto) => void,
  ): () => void {
    return this.liveKCandleService.followKCandles(symbol, chart, onReport)
  }

  /** 合約圖表上該說的那一句話，至多一句。 */
  liveUpdateNotice(
    contractTradingSymbol: ContractTradingSymbolDto | null,
    report: LiveKCandleReportDto | null,
  ): LiveUpdateNoticeVo | null {
    return this.liveKCandleService.contractLiveUpdateNotice(contractTradingSymbol, report)
  }
}
