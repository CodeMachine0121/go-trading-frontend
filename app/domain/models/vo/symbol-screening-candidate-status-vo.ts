export type SymbolScreeningCandidateStatus = 'waiting' | 'processing' | 'passed' | 'rejected' | 'unfinished' | 'cancelled'

export const SYMBOL_SCREENING_CANDIDATE_STATUSES: readonly SymbolScreeningCandidateStatus[] = [
  'waiting', 'processing', 'passed', 'rejected', 'unfinished', 'cancelled',
]

// An unknown status must not read as a pass.
export const FALLBACK_SYMBOL_SCREENING_CANDIDATE_STATUS: SymbolScreeningCandidateStatus = 'unfinished'
