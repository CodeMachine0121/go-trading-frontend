export type StrategyBotWatchedSymbolRemovalRefusalReasonVo
  = | 'watchedSymbolHoldsPosition'
    | 'watchedSymbolAutoOrderOutstanding'

export const STRATEGY_BOT_WATCHED_SYMBOL_REMOVAL_REFUSAL_REASONS: readonly StrategyBotWatchedSymbolRemovalRefusalReasonVo[] = [
  'watchedSymbolHoldsPosition',
  'watchedSymbolAutoOrderOutstanding',
]
