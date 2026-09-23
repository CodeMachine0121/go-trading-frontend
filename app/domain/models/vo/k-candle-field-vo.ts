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

/**
 * 合約行情種類的算式收到的每一格有哪些項目——`data []indicator.ContractKCandle` 裡那個型別。
 *
 * **現貨那十項原樣在最前面、同名同義**：後端的型別內嵌了一根現貨形狀的 K 線，
 * 所以 `candle.Close` 這種寫法兩邊都成立。其餘是合約才有的：成交筆數、三組價格
 * （各自是一個 `indicator.PriceLine`，有 Open / High / Low / Close）、資金費率與持倉統計。
 *
 * 後端哪天改了 `vo.ContractKCandleVo`，要改的就是這一份清單。
 */
export const CONTRACT_K_CANDLE_FIELDS: KCandleFieldVo[] = [
  ...K_CANDLE_FIELDS,
  new KCandleFieldVo('TradeCount', 'int64', '成交筆數'),
  new KCandleFieldVo('Mark', 'indicator.PriceLine', '標記價格的開高低收'),
  new KCandleFieldVo('Index', 'indicator.PriceLine', '指數價格的開高低收'),
  new KCandleFieldVo('PremiumIndex', 'indicator.PriceLine', '溢價指數的開高低收（可以是負的）'),
  new KCandleFieldVo('FundingRate', 'float64', '這一格收盤時現行的資金費率'),
  new KCandleFieldVo('FundingSettledInBar', 'bool', '這一格內有沒有資金費率結算'),
  new KCandleFieldVo('OpenInterest', 'float64', '持倉量'),
  new KCandleFieldVo('OpenInterestValue', 'float64', '持倉價值'),
  new KCandleFieldVo('AccountLongShare', 'float64', '多空人數比：多方佔比'),
  new KCandleFieldVo('AccountShortShare', 'float64', '多空人數比：空方佔比'),
  new KCandleFieldVo('AccountLongShortRatio', 'float64', '多空人數比：比值'),
  new KCandleFieldVo('TopTraderPositionLongShare', 'float64', '大戶多空持倉比：多方佔比'),
  new KCandleFieldVo('TopTraderPositionShortShare', 'float64', '大戶多空持倉比：空方佔比'),
  new KCandleFieldVo('TopTraderPositionLongShortRatio', 'float64', '大戶多空持倉比：比值'),
  new KCandleFieldVo('KCandleVo', 'indicator.KCandle', '內嵌的那一根現貨形狀，可以整根交給吃 indicator.KCandle 的函式'),
]
