import Decimal from 'decimal.js'
import type { SymbolScreeningCandidate } from '~/domain/models/entities/symbol-screening-candidate'
import type { SymbolScreeningCandidateStatus } from '~/domain/models/vo/symbol-screening-candidate-status-vo'
import {
  FALLBACK_SYMBOL_SCREENING_CANDIDATE_STATUS,
  SYMBOL_SCREENING_CANDIDATE_STATUSES,
} from '~/domain/models/vo/symbol-screening-candidate-status-vo'
import type { SymbolScreeningTone } from '~/domain/models/vo/symbol-screening-tone-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SymbolScreeningCandidateDto } from '~/domain/models/dto/symbol-screening-candidate-dto'
import { SymbolScreeningSegmentDto } from '~/domain/models/dto/symbol-screening-segment-dto'
import { SymbolScreeningContributionDto } from '~/domain/models/dto/symbol-screening-contribution-dto'

const STATUS_PRESENTATIONS: Readonly<Record<SymbolScreeningCandidateStatus, { label: LocalizedTextVo, tone: SymbolScreeningTone }>> = {
  waiting: { label: new LocalizedTextVo('等待中', 'Waiting'), tone: 'neutral' },
  processing: { label: new LocalizedTextVo('處理中', 'Processing'), tone: 'info' },
  passed: { label: new LocalizedTextVo('通過', 'Passed'), tone: 'success' },
  rejected: { label: new LocalizedTextVo('淘汰', 'Rejected'), tone: 'danger' },
  unfinished: { label: new LocalizedTextVo('無法完成', 'Unfinished'), tone: 'warning' },
  cancelled: { label: new LocalizedTextVo('已取消', 'Cancelled'), tone: 'neutral' },
}

const STAGE_LABELS: Readonly<Record<string, LocalizedTextVo>> = {
  basicCondition: new LocalizedTextVo('基本條件', 'Basic conditions'),
  portability: new LocalizedTextVo('策略移植', 'Strategy portability'),
}

const PERCENT_DECIMAL_PLACES = 1

const THOUSANDS_BOUNDARY = /\B(?=(\d{3})+(?!\d))/g

export class SymbolScreeningCandidateDomain {
  private readonly status: SymbolScreeningCandidateStatus

  constructor(private readonly candidate: SymbolScreeningCandidate) {
    this.status = SYMBOL_SCREENING_CANDIDATE_STATUSES.find(status => status === candidate.status)
      ?? FALLBACK_SYMBOL_SCREENING_CANDIDATE_STATUS
  }

  toDto(): SymbolScreeningCandidateDto {
    const reason = this.candidate.reason.trim()
    const contribution = this.candidate.contribution
    const percentText = (fraction: number, signed: boolean) =>
      `${signed && fraction >= 0 ? '+' : ''}${new Decimal(fraction).times(100).toFixed(PERCENT_DECIMAL_PLACES)}%`

    return new SymbolScreeningCandidateDto(
      this.candidate.symbol,
      this.status,
      STATUS_PRESENTATIONS[this.status].label,
      STATUS_PRESENTATIONS[this.status].tone,
      STAGE_LABELS[this.candidate.stage] ?? null,
      reason === '' ? null : reason,
      this.candidate.recommendationRank,
      this.candidate.historyDays,
      this.candidate.averageDailyQuoteVolume === null
        ? null
        : this.candidate.averageDailyQuoteVolume.toFixed(0).replace(THOUSANDS_BOUNDARY, ','),
      this.candidate.segments.map(segment => new SymbolScreeningSegmentDto(
        segment.startTime,
        segment.endTime,
        percentText(segment.returnRate, true),
        percentText(segment.maximumDrawdown, false),
        segment.closedTradeCount,
        segment.liquidationCount,
      )),
      this.candidate.returnWithoutBestSegment === null
        ? null
        : percentText(this.candidate.returnWithoutBestSegment, true),
      contribution === null
        ? null
        : new SymbolScreeningContributionDto(
            percentText(contribution.inMarketShare, false),
            percentText(contribution.overlapShare, false),
            contribution.baselineLongestGapDays,
            contribution.combinedLongestGapDays,
            contribution.gapReductionDays,
          ),
    )
  }
}
