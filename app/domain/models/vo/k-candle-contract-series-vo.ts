import type { AggregationIntervalVo } from '~/domain/models/vo/aggregation-interval-vo'
import type { KCandleContract } from '~/domain/models/entities/k-candle-contract'

/**
 * VO：一次合約序列取回的成果——那批彙總過的合約 K 線，以及**系統說它用了哪一種刻度**。
 * 不可變、無行為。
 *
 * 兩者一起回來的理由與現貨的 KCandleSeriesVo 相同：同一段時間以兩種刻度取回，
 * 會得到兩批都正確、卻完全不同的 K 線。
 *
 * 帶回來的是**整根**合約 K 線（三條線都在），不是只有成交價：
 * 圖上現在只畫成交價，但哪天要疊畫標記價格，資料已經在這裡了。
 */
export class KCandleContractSeriesVo {
  constructor(
    public readonly kCandleContracts: KCandleContract[],
    public readonly interval: AggregationIntervalVo,
  ) {}
}
