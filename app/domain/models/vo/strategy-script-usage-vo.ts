/**
 * 一支策略腳本的用途。與交易服務同名同值。
 *
 * - `chart`：圖表用——只在 K 線圖表上套用。
 * - `calculation`：計算用——只用於交易策略的訊號來源、標的篩選等要算出買賣的地方。
 */
export type StrategyScriptUsage = 'chart' | 'calculation'

/** 新增對話框上的順序：計算用（預設）在前。 */
export const STRATEGY_SCRIPT_USAGES: readonly StrategyScriptUsage[] = ['calculation', 'chart']
