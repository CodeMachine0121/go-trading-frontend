import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export type TradeFigureTone = 'success' | 'danger' | 'neutral' | 'muted'

/** 這一格量的是哪一個數字——以它在領域裡的欄位名稱表示，不隨畫面語言改變。 */
export type TradeFigureKind
  = | 'netProfit'
    | 'grossProfit'
    | 'floatingProfit'
    | 'totalFee'
    | 'fundingFee'
    | 'buyCost'
    | 'entryNotional'
    | 'entryMargin'
    | 'returnRate'
    | 'returnOnMarginPercentage'
    | 'plannedRisk'
    | 'rMultiple'
    | 'maximumAdverseExcursion'
    | 'maximumFavorableExcursion'
    | 'profitCaptureRate'
    | 'entrySlippagePercentage'
    | 'estimatedLiquidationPrice'
    | 'winRate'
    | 'averageReturnRate'
    | 'averageRMultiple'
    | 'profitFactor'
    | 'averageEntrySlippagePercentage'
    | 'feeShareOfGrossProfit'
    | 'cumulativeNetProfit'
    | 'cumulativeRMultiple'

export class TradeFigureVo {
  constructor(
    public readonly kind: TradeFigureKind,
    public readonly label: LocalizedTextVo,
    public readonly text: LocalizedTextVo,
    public readonly tone: TradeFigureTone,
    public readonly note: LocalizedTextVo | null = null,
  ) {}
}
