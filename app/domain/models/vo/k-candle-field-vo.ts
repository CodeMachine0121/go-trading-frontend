import { KCandleFieldDto } from '~/domain/models/dto/k-candle-field-dto'

/** VO：沙箱裡那個 K 線型別的其中一個欄位。不可變、無行為。 */
export class KCandleFieldVo {
  constructor(
    public readonly name: string,
    public readonly type: string,
    public readonly label: string,
  ) {}

  toDto(): KCandleFieldDto {
    return new KCandleFieldDto(this.name, this.type, this.label)
  }
}

/**
 * 算式收到的每一根 K 線有哪些欄位——也就是外框上 `data []indicator.KCandle` 裡那個型別。
 *
 * **這份清單描述的是沙箱裡的型別，不是後端資料庫那張表。** 兩者刻意不一樣，
 * 而且差異正是最容易寫錯的地方：
 *
 * - 資料庫那張表有 `ID`（一個持久化用的鍵），**沙箱裡沒有**——算式看不到它。
 * - 起始時間在表上是 `time.Time`，在沙箱裡是 **`OpenTimeUnixSeconds int64`**：
 *   沙箱只開放 `math` 與 `sort` 兩個套件，沒有 `time` 可以匯入，所以時間以 Unix 秒交給算式。
 * - 價量在表上是 `decimal.Decimal`（存錢的精度），在沙箱裡一律是 **`float64`**：
 *   算式做的是純運算，直接加減乘除就好。
 *
 * 順序照著「身分 → 開高低收 → 量」排，與 K 線瀏覽那張表的欄位順序一致——
 * 同一批東西在兩個地方用兩種順序列出，讀的人得重新找一次。
 *
 * 後端哪天改了 `vo.KCandleVo`，要改的就是這一份清單。
 */
export const K_CANDLE_FIELDS: KCandleFieldVo[] = [
  new KCandleFieldVo('Symbol', 'string', '交易標的'),
  new KCandleFieldVo('OpenTimeUnixSeconds', 'int64', '起始時間（Unix 秒）'),
  new KCandleFieldVo('Open', 'float64', '開盤價'),
  new KCandleFieldVo('High', 'float64', '最高價'),
  new KCandleFieldVo('Low', 'float64', '最低價'),
  new KCandleFieldVo('Close', 'float64', '收盤價'),
  new KCandleFieldVo('Volume', 'float64', '成交量'),
  new KCandleFieldVo('QuoteVolume', 'float64', '成交額'),
  new KCandleFieldVo('TakerBuyBaseVolume', 'float64', '主動買入量'),
  new KCandleFieldVo('TakerBuyQuoteVolume', 'float64', '主動買入額'),
]
