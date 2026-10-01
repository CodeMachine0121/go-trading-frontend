export type AutoOrderRefusalReasonVo
  = | 'binanceTradingKeyNotConfigured'
    | 'tradableMarketNotCovered'
    | 'binanceTradingKeyChanged'

export const AUTO_ORDER_REFUSAL_REASONS: readonly AutoOrderRefusalReasonVo[] = [
  'binanceTradingKeyNotConfigured',
  'tradableMarketNotCovered',
  'binanceTradingKeyChanged',
]
