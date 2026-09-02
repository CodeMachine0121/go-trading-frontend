/**
 * DTO：一個可查交易標的交給 application 與畫面的唯一形狀。
 * 目前只有名字；後端未來多帶什麼（有幾根、最新一根是什麼時候），也是加在這裡。
 */
export class TradingSymbolDto {
  constructor(public readonly symbol: string) {}
}
