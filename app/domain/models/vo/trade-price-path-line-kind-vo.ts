/** 價格路徑上的一條水平線標的是哪一個價——以它在交易紀錄裡的欄位名稱表示。 */
export type TradePricePathLineKind
  = | 'averageBuyPrice'
    | 'averageEntryPrice'
    | 'plannedStopLossPrice'
    | 'plannedTakeProfitPrice'
    | 'maximumAdversePrice'
    | 'maximumFavorablePrice'
