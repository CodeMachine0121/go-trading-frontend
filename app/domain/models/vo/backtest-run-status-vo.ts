/** 一筆回測輪次走到哪：排隊中、進行中、完成、失敗、已取消。沿用後端的詞。 */
export const BACKTEST_RUN_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const

export type BacktestRunStatus = typeof BACKTEST_RUN_STATUSES[number]

/** 認不得的狀態一律讀成失敗——把一筆不明的輪次說成還在跑，會讓人等一件不會發生的事。 */
export const FALLBACK_BACKTEST_RUN_STATUS: BacktestRunStatus = 'failed'
