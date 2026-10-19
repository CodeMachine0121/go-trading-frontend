import Decimal from 'decimal.js'
import type { ISymbolScreeningProxy } from '~/domain/interface/i-symbol-screening-proxy'
import type { SymbolScreeningProfileWriteDomain } from '~/domain/models/domains/symbol-screening-profile-write-domain'
import type { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { SymbolScreeningProfile } from '~/domain/models/entities/symbol-screening-profile'
import { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import { SymbolScreeningRun } from '~/domain/models/entities/symbol-screening-run'
import { SymbolScreeningRunDetail } from '~/domain/models/entities/symbol-screening-run-detail'
import { SymbolScreeningSnapshot } from '~/domain/models/entities/symbol-screening-snapshot'
import { SymbolScreeningCandidate } from '~/domain/models/entities/symbol-screening-candidate'
import { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'
import { SymbolScreeningSegmentFindingVo } from '~/domain/models/vo/symbol-screening-segment-finding-vo'
import { SymbolScreeningContributionVo } from '~/domain/models/vo/symbol-screening-contribution-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { AdministratorRequiredError } from '~/domain/errors/administrator-required-error'
import { SymbolScreeningRunAlreadyEndedError } from '~/domain/errors/symbol-screening-run-already-ended-error'
import type { BackendRequestBody, BackendRequestOptions } from '~/infrastructure/proxy/backend-api-proxy'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const PROFILES_ENDPOINT = '/symbol-screening-profiles'
const RUNS_ENDPOINT = '/symbol-screening-runs'
const RUN_LIST_LIMIT = '50'
const ADMINISTRATOR_REQUIRED_STATUS = 403
const ALREADY_ENDED_STATUS = 409

type ParameterValueWire = { name: string, value: number }

type TermsWire = {
  aggregationInterval: string
  tradingMode: string
  leverage: string
  entryCostPercentage: string
  slippagePercentage: string
  historyDays: number
  segmentCount: number
  minimumTradeCount: number
  minimumAverageDailyQuoteVolume: string
  baselineSymbols: string[] | null
}

type ProfileWire = TermsWire & {
  id: number
  name: string
  strategyScriptId: number
  parameterValues: ParameterValueWire[] | null
}

type RunWire = {
  id: number
  profileName: string
  status: string
  processedCandidateCount: number
  candidateCount: number
  failureReason: string
  contributionFailureReason: string
  submittedAt: string
  finishedAt: string | null
}

type CandidateWire = {
  symbol: string
  position: number
  status: string
  stage: string
  reason: string
  recommendationRank: number | null
  findings: {
    historyDays?: number
    averageDailyQuoteVolume?: string
    segments?: {
      startTime: string
      endTime: string
      returnRate: number
      maximumDrawdown: number
      closedTradeCount: number
      liquidationCount: number
    }[]
    returnWithoutBestSegment?: number
    contribution?: {
      inMarketShare: number
      overlapShare: number
      baselineLongestGapDays: number
      combinedLongestGapDays: number
      gapReductionDays: number
    }
  } | null
}

type RunDetailWire = RunWire & {
  snapshot: TermsWire & { profileName: string }
  candidates: CandidateWire[] | null
}

type RunPageWire = { runs: RunWire[] | null }

export class SymbolScreeningProxy extends BackendApiProxy implements ISymbolScreeningProxy {
  async listProfiles(): Promise<SymbolScreeningProfile[]> {
    const wire = await this.requestScreening<ProfileWire[] | null>(PROFILES_ENDPOINT)

    return (wire ?? []).map(profile => this.toProfile(profile))
  }

  async saveProfile(writeDomain: SymbolScreeningProfileWriteDomain): Promise<SymbolScreeningProfile> {
    const optionalFigures: Record<string, string | number | null> = {
      leverage: writeDomain.leverage,
      entryCostPercentage: writeDomain.entryCostPercentage,
      slippagePercentage: writeDomain.slippagePercentage,
      historyDays: writeDomain.historyDays,
      segmentCount: writeDomain.segmentCount,
      minimumTradeCount: writeDomain.minimumTradeCount,
      minimumAverageDailyQuoteVolume: writeDomain.minimumAverageDailyQuoteVolume,
    }
    const body: BackendRequestBody = {
      name: writeDomain.name,
      strategyScriptId: writeDomain.strategyScriptId,
      parameterValues: writeDomain.parameterValues.map(parameter => ({ name: parameter.name, value: parameter.value })),
      aggregationInterval: writeDomain.aggregationInterval,
      tradingMode: writeDomain.tradingMode,
      baselineSymbols: [...writeDomain.baselineSymbols],
      ...Object.fromEntries(Object.entries(optionalFigures).filter(([, figure]) => figure !== null)),
    }
    const wire = await this.requestScreening<ProfileWire>(
      writeDomain.id === null ? PROFILES_ENDPOINT : `${PROFILES_ENDPOINT}/${writeDomain.id}`,
      { method: writeDomain.id === null ? 'POST' : 'PUT', body },
    )

    return this.toProfile(wire)
  }

  async deleteProfile(id: number): Promise<void> {
    await this.requestScreening<null>(`${PROFILES_ENDPOINT}/${id}`, { method: 'DELETE' })
  }

  async submitRun(submissionDto: SymbolScreeningRunSubmissionDto): Promise<SymbolScreeningRun> {
    const wire = await this.requestScreening<RunWire>(RUNS_ENDPOINT, {
      method: 'POST',
      body: { profileId: submissionDto.profileId, symbols: submissionDto.symbols },
    })

    return this.toRun(wire)
  }

  async listRuns(inBackground: boolean): Promise<SymbolScreeningRun[]> {
    const wire = await this.requestScreening<RunPageWire>(RUNS_ENDPOINT, {
      query: { limit: RUN_LIST_LIMIT },
      background: inBackground,
    })

    return (wire.runs ?? []).map(run => this.toRun(run))
  }

  async getRun(id: number, inBackground: boolean): Promise<SymbolScreeningRunDetail> {
    const wire = await this.requestScreening<RunDetailWire>(`${RUNS_ENDPOINT}/${id}`, { background: inBackground })

    return new SymbolScreeningRunDetail(
      this.toRun(wire),
      new SymbolScreeningSnapshot(wire.snapshot.profileName, this.toTerms(wire.snapshot)),
      (wire.candidates ?? []).map(candidate => new SymbolScreeningCandidate(
        candidate.symbol,
        candidate.position,
        candidate.status,
        candidate.stage,
        candidate.reason,
        candidate.recommendationRank,
        candidate.findings?.historyDays ?? null,
        candidate.findings?.averageDailyQuoteVolume === undefined
          ? null
          : new Decimal(candidate.findings.averageDailyQuoteVolume),
        (candidate.findings?.segments ?? []).map(segment => new SymbolScreeningSegmentFindingVo(
          new Date(segment.startTime),
          new Date(segment.endTime),
          segment.returnRate,
          segment.maximumDrawdown,
          segment.closedTradeCount,
          segment.liquidationCount,
        )),
        candidate.findings?.returnWithoutBestSegment ?? null,
        candidate.findings?.contribution === undefined
          ? null
          : new SymbolScreeningContributionVo(
              candidate.findings.contribution.inMarketShare,
              candidate.findings.contribution.overlapShare,
              candidate.findings.contribution.baselineLongestGapDays,
              candidate.findings.contribution.combinedLongestGapDays,
              candidate.findings.contribution.gapReductionDays,
            ),
      )),
    )
  }

  async cancelRun(id: number): Promise<SymbolScreeningRun> {
    try {
      const wire = await this.requestScreening<RunWire>(`${RUNS_ENDPOINT}/${id}/cancel`, { method: 'POST' })

      return this.toRun(wire)
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError && error.status === ALREADY_ENDED_STATUS) {
        throw new SymbolScreeningRunAlreadyEndedError(error.message, { cause: error })
      }

      throw error
    }
  }

  private async requestScreening<TWire>(
    path: string,
    options: BackendRequestOptions = {},
  ): Promise<TWire> {
    try {
      return await this.requestBackend<TWire>(path, options)
    }
    catch (error: unknown) {
      if (error instanceof BackendRequestRejectedError && error.status === ADMINISTRATOR_REQUIRED_STATUS) {
        throw new AdministratorRequiredError(error.message, { cause: error })
      }

      throw error
    }
  }

  private toProfile(wire: ProfileWire): SymbolScreeningProfile {
    return new SymbolScreeningProfile(
      wire.id,
      wire.name,
      wire.strategyScriptId,
      (wire.parameterValues ?? []).map(parameter => new SymbolScreeningParameterValueVo(parameter.name, parameter.value)),
      this.toTerms(wire),
    )
  }

  private toTerms(wire: TermsWire): SymbolScreeningTerms {
    return new SymbolScreeningTerms(
      wire.aggregationInterval,
      wire.tradingMode,
      new Decimal(wire.leverage),
      new Decimal(wire.entryCostPercentage),
      new Decimal(wire.slippagePercentage),
      wire.historyDays,
      wire.segmentCount,
      wire.minimumTradeCount,
      new Decimal(wire.minimumAverageDailyQuoteVolume),
      wire.baselineSymbols ?? [],
    )
  }

  private toRun(wire: RunWire): SymbolScreeningRun {
    return new SymbolScreeningRun(
      wire.id,
      wire.profileName,
      wire.status,
      wire.processedCandidateCount,
      wire.candidateCount,
      wire.failureReason,
      wire.contributionFailureReason,
      new Date(wire.submittedAt),
      wire.finishedAt === null ? null : new Date(wire.finishedAt),
    )
  }
}
