export type TradeStatisticsPeriod = '7d' | '30d' | '90d' | 'all'

export const TRADE_STATISTICS_PERIODS: readonly TradeStatisticsPeriod[] = ['7d', '30d', '90d', 'all']

export const DEFAULT_TRADE_STATISTICS_PERIOD: TradeStatisticsPeriod = '30d'
