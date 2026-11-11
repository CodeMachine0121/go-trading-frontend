/**
 * 訊號來源卡一支策略腳本都挑不到時，是哪一種挑不到——三種的下一步不同：
 *
 * - `noStrategyScripts`：一支都沒有，去建一支。
 * - `noSignalStrategyScripts`：有，但沒有一支吐訊號，去改指標值種類。
 * - `noCalculationStrategyScripts`：吐訊號的全是圖表用，去切成計算用。
 */
export type SignalSourceShortageVo = 'noStrategyScripts' | 'noSignalStrategyScripts' | 'noCalculationStrategyScripts'
