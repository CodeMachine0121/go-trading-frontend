export type ContractTradeStatisticsPeriod = '7d' | '30d' | '90d' | 'all'

export const CONTRACT_TRADE_STATISTICS_PERIODS: readonly ContractTradeStatisticsPeriod[] = ['7d', '30d', '90d', 'all']

export const DEFAULT_CONTRACT_TRADE_STATISTICS_PERIOD: ContractTradeStatisticsPeriod = '30d'
