import Decimal from 'decimal.js'
import { SymbolScreeningCandidate } from '~/domain/models/entities/symbol-screening-candidate'
import { SymbolScreeningProfile } from '~/domain/models/entities/symbol-screening-profile'
import { SymbolScreeningRun } from '~/domain/models/entities/symbol-screening-run'
import { SymbolScreeningRunDetail } from '~/domain/models/entities/symbol-screening-run-detail'
import { SymbolScreeningSnapshot } from '~/domain/models/entities/symbol-screening-snapshot'
import { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import type { SymbolScreeningContributionVo } from '~/domain/models/vo/symbol-screening-contribution-vo'
import { SymbolScreeningSegmentFindingVo } from '~/domain/models/vo/symbol-screening-segment-finding-vo'
import { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'

export function buildScreeningTerms(historyDays = 730): SymbolScreeningTerms {
  return new SymbolScreeningTerms(
    '4h', 'longOnly', new Decimal('1'), new Decimal('0.05'), new Decimal('0.05'),
    historyDays, 3, 6, new Decimal('20000000'), [])
}

export function buildScreeningProfile(id = 1, name = '趨勢 V3', historyDays = 730): SymbolScreeningProfile {
  return new SymbolScreeningProfile(id, name, 9, [], buildScreeningTerms(historyDays))
}

export function buildScreeningRun(
  id: number,
  status: string,
  overrides: { processed?: number, total?: number, failureReason?: string, contributionFailureReason?: string } = {},
): SymbolScreeningRun {
  return new SymbolScreeningRun(
    id, '趨勢 V3', status, overrides.processed ?? 0, overrides.total ?? 2,
    overrides.failureReason ?? '', overrides.contributionFailureReason ?? '',
    new Date('2026-10-19T08:00:00Z'), null)
}

export function buildCandidate(
  symbol: string,
  status: string,
  overrides: {
    stage?: string
    reason?: string
    rank?: number | null
    historyDays?: number | null
    averageDailyQuoteVolume?: Decimal | null
    segmentReturns?: number[]
    returnWithoutBestSegment?: number | null
    contribution?: SymbolScreeningContributionVo | null
  } = {},
): SymbolScreeningCandidate {
  return new SymbolScreeningCandidate(
    symbol, 1, status, overrides.stage ?? '', overrides.reason ?? '', overrides.rank ?? null,
    overrides.historyDays ?? null, overrides.averageDailyQuoteVolume ?? null,
    (overrides.segmentReturns ?? []).map(returnRate => new SymbolScreeningSegmentFindingVo(
      new Date('2024-01-01T00:00:00Z'), new Date('2024-09-01T00:00:00Z'), returnRate, 0.1, 8, 0)),
    overrides.returnWithoutBestSegment ?? null,
    overrides.contribution ?? null,
  )
}

export function buildRunDetail(
  run: SymbolScreeningRun,
  candidates: SymbolScreeningCandidate[],
  historyDays = 730,
): SymbolScreeningRunDetail {
  return new SymbolScreeningRunDetail(run, new SymbolScreeningSnapshot('趨勢 V3', buildScreeningTerms(historyDays)), candidates)
}

export function buildProfileWriteDto(
  overrides: { id?: number | null, name?: string, historyDays?: string, baselineSymbols?: string } = {},
): SymbolScreeningProfileWriteDto {
  return new SymbolScreeningProfileWriteDto(
    overrides.id ?? null, overrides.name ?? '趨勢 V3', 9, '4h', 'longOnly',
    '', '', '', overrides.historyDays ?? '', '', '', '', overrides.baselineSymbols ?? '')
}
