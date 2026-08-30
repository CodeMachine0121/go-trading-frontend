import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'

/** 進入畫面時預設查詢的區間長度：最近二十四小時。這是唯一寫下這個長度的地方。 */
const DEFAULT_QUERY_RANGE_MILLISECONDS = 24 * 60 * 60 * 1000

/**
 * Domain Service：跨多根 K 線的編排。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class KCandleService {
  constructor(private readonly kCandleProxy: IKCandleProxy) {}

  /**
   * 查詢一段區間的 K 線：驗證條件（不合法就沒有查詢）→ 取回 → 由早到晚排序 → 轉 DTO。
   * 呼叫端拿到的清單順序、筆數、漲跌都已經算好。
   */
  async searchKCandles(kCandleQueryDto: KCandleQueryDto): Promise<KCandleSearchResultDto> {
    const kCandleQueryDomain = new KCandleQueryDomain(kCandleQueryDto)
    const kCandles = await this.kCandleProxy.findKCandlesInRange(kCandleQueryDomain)

    const earliestFirstKCandles = [...kCandles].sort(
      (former, latter) => former.openTime.getTime() - latter.openTime.getTime(),
    )

    return new KCandleSearchResultDto(
      earliestFirstKCandles.map(kCandle => kCandle.toDomain().toDto()),
    )
  }

  /** 進入畫面時帶入的預設查詢區間：目前時間往前二十四小時到目前時間。 */
  buildDefaultQuery(symbol: string): KCandleQueryDto {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - DEFAULT_QUERY_RANGE_MILLISECONDS)

    return new KCandleQueryDto(symbol, startTime, endTime)
  }
}
