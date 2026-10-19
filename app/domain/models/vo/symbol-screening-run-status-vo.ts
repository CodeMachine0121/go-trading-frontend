export type SymbolScreeningRunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export const SYMBOL_SCREENING_RUN_STATUSES: readonly SymbolScreeningRunStatus[] = [
  'queued', 'running', 'succeeded', 'failed', 'cancelled',
]

export const FALLBACK_SYMBOL_SCREENING_RUN_STATUS: SymbolScreeningRunStatus = 'failed'
