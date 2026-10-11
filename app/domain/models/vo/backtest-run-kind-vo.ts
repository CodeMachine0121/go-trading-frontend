/** 四種回測：現貨腳本、合約腳本、現貨交易策略、合約交易策略。沿用後端的詞。 */
export const BACKTEST_RUN_KINDS = [
  'spotScript', 'contractScript', 'spotTradingStrategy', 'contractTradingStrategy',
] as const

export type BacktestRunKind = typeof BACKTEST_RUN_KINDS[number]

export const FALLBACK_BACKTEST_RUN_KIND: BacktestRunKind = 'spotScript'
