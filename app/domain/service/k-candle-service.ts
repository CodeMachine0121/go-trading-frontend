import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleQueryDomain } from '~/domain/models/domains/k-candle-query-domain'
import { K_CANDLE_INTERVAL_MINUTES, KCandleWriteDomain } from '~/domain/models/domains/k-candle-write-domain'
import { KCandleIdentityVo } from '~/domain/models/vo/k-candle-identity-vo'
import { KCandleQueryDto } from '~/domain/models/dto/k-candle-query-dto'
import { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleWriteDto } from '~/domain/models/dto/k-candle-write-dto'
import type { KCandleIdentityDto } from '~/domain/models/dto/k-candle-identity-dto'

/** 進入畫面時預設查詢的區間長度：最近二十四小時。這是唯一寫下這個長度的地方。 */
const DEFAULT_QUERY_RANGE_MILLISECONDS = 24 * 60 * 60 * 1000

/**
 * Domain Service：跨多根 K 線的編排。
 * 公開用例方法之間互不呼叫；需要串接時由 Application 負責。
 */
export class KCandleService {
  constructor(private readonly kCandleProxy: IKCandleProxy) {}

  /**
   * 查詢一段區間的 K 線：驗證條件（不合法就沒有查詢）→ 取回 → 由新到舊排序 → 轉 DTO。
   * 呼叫端拿到的清單順序、筆數、漲跌都已經算好。
   */
  async searchKCandles(kCandleQueryDto: KCandleQueryDto): Promise<KCandleSearchResultDto> {
    const kCandleQueryDomain = new KCandleQueryDomain(kCandleQueryDto)
    const kCandles = await this.kCandleProxy.findKCandlesInRange(kCandleQueryDomain)

    // 由新到舊：看行情第一眼要看的是「現在怎麼樣」，最新那一根就該在最上面。
    const newestFirstKCandles = [...kCandles].sort(
      (former, latter) => latter.openTime.getTime() - former.openTime.getTime(),
    )

    return new KCandleSearchResultDto(
      newestFirstKCandles.map(kCandle => kCandle.toDomain().toDto()),
    )
  }

  /** 進入畫面時帶入的預設查詢區間：目前時間往前二十四小時到目前時間。 */
  buildDefaultQuery(symbol: string): KCandleQueryDto {
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - DEFAULT_QUERY_RANGE_MILLISECONDS)

    return new KCandleQueryDto(symbol, startTime, endTime)
  }

  /**
   * 存下一根 K 線。所有寫入規則在建構 KCandleWriteDomain 時就檢查完，
   * 不合法就不會有任何請求送出去。同一個身分已存在時，後端會覆蓋既有的那一根。
   */
  async saveKCandle(kCandleWriteDto: KCandleWriteDto): Promise<KCandleDto> {
    const kCandleWriteDomain = new KCandleWriteDomain(kCandleWriteDto)
    const savedKCandle = await this.kCandleProxy.saveKCandle(kCandleWriteDomain)

    return savedKCandle.toDomain().toDto()
  }

  /** 更新一根既有的 K 線；身分不得更換，因此它一律取自被更新的那一根。 */
  async updateKCandle(kCandleWriteDto: KCandleWriteDto): Promise<KCandleDto> {
    const kCandleWriteDomain = new KCandleWriteDomain(kCandleWriteDto)
    const updatedKCandle = await this.kCandleProxy.updateKCandle(kCandleWriteDomain)

    return updatedKCandle.toDomain().toDto()
  }

  /** 刪除指名的那一根 K 線。 */
  async deleteKCandle(kCandleIdentityDto: KCandleIdentityDto): Promise<void> {
    const kCandleIdentityVo = new KCandleIdentityVo(
      kCandleIdentityDto.symbol, kCandleIdentityDto.openTime)

    await this.kCandleProxy.deleteKCandle(kCandleIdentityVo)
  }

  /**
   * 新增表單的起點：起始時間預設對齊到最近的五分鐘刻度（因此必定合法、也必定不指向未來），
   * 價量欄位留空等使用者填。
   */
  buildNewKCandleDraft(symbol: string): KCandleWriteDto {
    const currentTime = new Date()
    const alignedOpenTime = new Date(currentTime)
    alignedOpenTime.setUTCSeconds(0, 0)
    alignedOpenTime.setUTCMinutes(
      currentTime.getUTCMinutes() - (currentTime.getUTCMinutes() % K_CANDLE_INTERVAL_MINUTES))

    return new KCandleWriteDto(symbol, alignedOpenTime, '', '', '', '', '', '', '', '')
  }
}
