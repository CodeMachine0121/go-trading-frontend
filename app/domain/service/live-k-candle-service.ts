import type { ILiveKCandleProxy } from '~/domain/interface/i-live-k-candle-proxy'
import { LiveKCandleChartDomain } from '~/domain/models/domains/live-k-candle-chart-domain'
import { LiveUpdateNoticeDomain } from '~/domain/models/domains/live-update-notice-domain'
import type { LiveUpdateNoticeVo } from '~/domain/models/vo/live-update-notice-vo'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
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
        update.status === 'unavailable',
        update.status === 'marketClosed',
      ))
    })
  }

  /**
   * 該對看的人說哪一句話，至多一句。
   *
   * 它與跟盤本身是兩個用例，互不呼叫：進到圖表的那一刻還沒有任何一則更新，
   * 而「這個市場收盤中」在那一刻就該說了——把它綁在更新上，等於要人先等一則
   * 永遠不會來的更新才知道市場關了。
   *
   * 還沒挑到標的、或還沒有任何更新時，一律當作一切正常：那時什麼都還沒發生，
   * 先說一句只是在猜。
   *
   * 兩個來源都問：進畫面那一刻問到的那一份說得出「現在就已經收盤了」，
   * 而市場也會在人看著的時候收盤——那一刻只有更新說得出來。少問哪一個，
   * 都會有一種收盤說不出口。
   *
   * **市場真的動了就蓋過那一份。** 進畫面那一刻問到的東西不會自己更新，所以
   * 在開盤前打開圖表的人，會在九點之後繼續看到「收盤中」——一邊看著最後那一根
   * 在旁邊跳。一則帶著 K 線的更新是後端說它跟得動，那比一份放了半小時的答案新。
   */
  liveUpdateNotice(
    tradingSymbol: TradingSymbolDto | null,
    report: LiveKCandleReportDto | null,
  ): LiveUpdateNoticeVo | null {
    const isTrading = report?.isTrading ?? false

    return new LiveUpdateNoticeDomain(
      isTrading || ((tradingSymbol?.isWithinTradingSession ?? true)
        && !(report?.isMarketClosed ?? false)),
      isTrading || ((tradingSymbol?.hasLiveUpdates ?? true)
        && !(report?.hasNoLivePlace ?? false)),
      report?.isStalled ?? false,
    ).notice()
  }
}
