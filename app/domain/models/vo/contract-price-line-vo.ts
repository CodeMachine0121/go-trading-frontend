import type Decimal from 'decimal.js'

/**
 * VO：合約 K 線上除了成交價以外的一條價格線（標記價格、指數價格或溢價指數）的
 * 開高低收。不可變、無行為。
 *
 * 四個數字一起才是一條線：只有收盤沒有開盤的一條線畫不出來，也說不出它這一分鐘怎麼走。
 * 所以一條線要嘛四個都在，要嘛整條不在——「整條不在」由持有它的那一方寫成 `null`。
 */
export class ContractPriceLineVo {
  constructor(
    public readonly open: Decimal,
    public readonly high: Decimal,
    public readonly low: Decimal,
    public readonly close: Decimal,
  ) {}
}
