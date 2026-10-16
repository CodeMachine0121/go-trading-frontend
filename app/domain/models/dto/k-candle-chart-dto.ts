import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { KCandleContractPricesDto } from '~/domain/models/dto/k-candle-contract-prices-dto'

/**
 * DTO：圖表這一次要畫的東西，也是畫面拿得到的唯一形狀。
 *
 * coveredStartTime / coveredEndTime 是這批資料涵蓋的範圍——比使用者正在看的那一段更寬
 * （整批取時兩側各多取半段，之後還會在兩邊接上一段）。要不要去要、在哪一側接，就是靠它判斷。
 *
 * **這裡有兩個關於粗細的東西，而且必須有兩個：**
 * - `interval` 是**系統實際用了哪一種**，圖上那句「每根涵蓋」說的是它。
 * - `aggregationIntervalChoice` 是**這一批當初以哪個選擇取回的**，
 *   下一次比對「選擇換了沒」說的是它。
 *
 * 拿 `interval` 去比對會在後端回的與挑的不同時無限重取：挑「一分鐘」而後端回「五分鐘」，
 * 下一次的選擇仍然是「一分鐘」，卻永遠不等於「五分鐘」，於是每一次都重取。
 * 兩者型別不同（刻度 vs 選擇），拿錯不會編譯過。
 */
export class KCandleChartDto {
  constructor(
    public readonly symbol: string,
    /** 系統這一次**實際**用了哪一種。給標題列看的。 */
    public readonly interval: AggregationIntervalVo,
    public readonly coveredStartTime: Date,
    public readonly coveredEndTime: Date,
    public readonly kCandles: KCandleDto[],
    /** 這一批當初以**哪個選擇**取回的。給下一次比對用的。 */
    public readonly aggregationIntervalChoice: AggregationIntervalChoiceDto,
    /** 只有合約圖表有：最新那一根的標記價格、指數價格與溢價指數。現貨圖表、或一根都沒有時為 null。 */
    public readonly latestContractPrices: KCandleContractPricesDto | null = null,
    /** 往左接上來的空白累積夠長了：那一頭已經沒有更早的資料，不必再去要。 */
    public readonly reachedEarliest: boolean = false,
    /**
     * 最近接連幾次往左接上來、一根都沒有的那幾段加起來多長（毫秒）。
     * 有休市的市場，一段剛好落在休市裡也會是空的——所以空一次不算到底，空得夠久才算。
     */
    public readonly emptyEarlierSpanMilliseconds: number = 0,
  ) {}

  /**
   * 這一批是不是這一檔、以這一種粗細取回的那一張圖。
   * 不是的話，它涵蓋得再廣都不算數：要整批換、要重新擺位置。
   */
  belongsTo(symbol: string, aggregationIntervalChoice: AggregationIntervalChoiceDto): boolean {
    return this.symbol === symbol && this.aggregationIntervalChoice.value === aggregationIntervalChoice.value
  }

  get count(): number {
    return this.kCandles.length
  }

  /**
   * 這一批涵蓋了多長（毫秒）。
   *
   * 只說自己的事實。**當初使用者看的是多長不在這裡回答**——那要除以預取倍數，
   * 而預取是加上去的那一側的規則；寫在這裡就變成兩個檔案共用一個沒有名字的除數，
   * 哪天預取比例改了，這裡會安靜地開始說錯話。
   */
  get coveredSpanMilliseconds(): number {
    return this.coveredEndTime.getTime() - this.coveredStartTime.getTime()
  }

  get isEmpty(): boolean {
    return this.kCandles.length === 0
  }

  /**
   * 最新那一根。空的時候是 `null`——與 `isEmpty` 是同一件事的兩種問法。
   *
   * 畫面上最大的那個數字說的就是它：一批 K 線的「現在多少錢」，
   * 是最後那一根的收盤價。漲跌與百分比它自己帶著（domain 算好的），
   * 這裡不再算第二次。
   */
  get latestKCandle(): KCandleDto | null {
    return this.kCandles[this.kCandles.length - 1] ?? null
  }

  /**
   * 最新那一根是幾點開始的。空的時候是 `null`。
   * 它是判斷「使用者看的是不是現在」的另一半資料。
   */
  get latestKCandleOpenTime(): Date | null {
    return this.latestKCandle?.openTime ?? null
  }
}
