import type Decimal from 'decimal.js'

/**
 * DTO：合約圖表上最新那一根的三條價格線收盤——標記價格、指數價格、溢價指數。
 *
 * 指數價格與溢價指數可以沒有值（開始記錄它們之前存下的舊合約 K 線沒有這兩條），
 * 那時是 null，畫成「—」，不是零。`recordedAt` 說出這三個數字是哪一根的。
 */
export class KCandleContractPricesDto {
  constructor(
    public readonly markPrice: Decimal,
    public readonly indexPrice: Decimal | null,
    public readonly premiumIndex: Decimal | null,
    public readonly recordedAt: Date,
  ) {}
}
