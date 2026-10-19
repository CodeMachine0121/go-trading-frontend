import { afterEach, describe, expect, it, vi } from 'vitest'
import { SymbolScreeningProxy } from '~/infrastructure/proxy/symbol-screening-proxy'
import { SymbolScreeningProfileWriteDomain } from '~/domain/models/domains/symbol-screening-profile-write-domain'
import { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'
import { AdministratorRequiredError } from '~/domain/errors/administrator-required-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { SymbolScreeningRunAlreadyEndedError } from '~/domain/errors/symbol-screening-run-already-ended-error'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

function proxyUnderTest(hooks?: BackendRequestHooks) {
  return new SymbolScreeningProxy(BASE_URL, signedInSessionStorage(), hooks)
}

function rejectionOf(status: number, message: string) {
  return Object.assign(new Error(message), { response: { status }, data: { message } })
}

const TERMS_WIRE = {
  aggregationInterval: '4h',
  tradingMode: 'longOnly',
  leverage: '1',
  entryCostPercentage: '0.05',
  slippagePercentage: '0.05',
  historyDays: 730,
  segmentCount: 3,
  minimumTradeCount: 6,
  minimumAverageDailyQuoteVolume: '20000000',
  baselineSymbols: null,
}

const PROFILE_WIRE = {
  ...TERMS_WIRE,
  id: 1,
  name: '趨勢 V3',
  strategyScriptId: 9,
  parameterValues: [{ name: 'fast', value: 20 }],
  createdAt: '2026-10-19T08:00:00Z',
  updatedAt: '2026-10-19T08:00:00Z',
}

const RUN_WIRE = {
  id: 12,
  profileId: 1,
  profileName: '趨勢 V3',
  status: 'queued',
  processedCandidateCount: 0,
  candidateCount: 2,
  progressPercent: 0,
  failureReason: '',
  contributionFailureReason: '',
  submittedAt: '2026-10-19T08:00:00Z',
  startedAt: null,
  finishedAt: '2026-10-19T09:00:00Z',
}

function writeDomainOf(id: number | null, historyDays = '', baselineSymbols = '') {
  return new SymbolScreeningProfileWriteDomain(new SymbolScreeningProfileWriteDto(
    id, ' 趨勢 V3 ', 9, '4h', 'longOnly', '', '0.04', '', historyDays, '', '', '', baselineSymbols,
    [new SymbolScreeningParameterValueVo('fast', 20)]))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SymbolScreeningProxy profiles', () => {
  it('reads profiles with their figures as exact decimals', async () => {
    const fetchMock = vi.fn().mockResolvedValue([PROFILE_WIRE])
    vi.stubGlobal('$fetch', fetchMock)

    const [profile] = await proxyUnderTest().listProfiles()

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-profiles`, expect.anything())
    expect(profile?.terms.minimumAverageDailyQuoteVolume.toString()).toBe('20000000')
    expect(profile?.terms.baselineSymbols).toEqual([])
    expect(profile?.parameterValues).toEqual([new SymbolScreeningParameterValueVo('fast', 20)])
  })

  it('reads a profile without parameter values', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{ ...PROFILE_WIRE, parameterValues: null }]))

    const [profile] = await proxyUnderTest().listProfiles()

    expect(profile?.parameterValues).toEqual([])
  })

  it('reads no profiles from a null list', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

    expect(await proxyUnderTest().listProfiles()).toEqual([])
  })

  it('creates a profile without the figures left blank', async () => {
    const fetchMock = vi.fn().mockResolvedValue(PROFILE_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    await proxyUnderTest().saveProfile(writeDomainOf(null, '', 'btcusdt, ETHUSDT'))

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-profiles`, expect.objectContaining({
      method: 'POST',
      body: {
        name: '趨勢 V3',
        strategyScriptId: 9,
        parameterValues: [{ name: 'fast', value: 20 }],
        aggregationInterval: '4h',
        tradingMode: 'longOnly',
        baselineSymbols: ['BTCUSDT', 'ETHUSDT'],
        entryCostPercentage: '0.04',
      },
    }))
  })

  it('updates the edited profile in place', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ...PROFILE_WIRE, historyDays: 365 })
    vi.stubGlobal('$fetch', fetchMock)

    const saved = await proxyUnderTest().saveProfile(writeDomainOf(1, '365'))

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-profiles/1`, expect.objectContaining({
      method: 'PUT',
      body: expect.objectContaining({ historyDays: 365 }),
    }))
    expect(saved.terms.historyDays).toBe(365)
  })

  it('deletes a profile', async () => {
    const fetchMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchMock)

    await proxyUnderTest().deleteProfile(1)

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-profiles/1`,
      expect.objectContaining({ method: 'DELETE' }))
  })

  it('passes a profile still in use on as the system worded it', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(409, '有篩選正在使用這份設定，等它結束再刪除')))

    const failure = await proxyUnderTest().deleteProfile(1).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
    expect((failure as Error).message).toBe('有篩選正在使用這份設定，等它結束再刪除')
  })

  it('turns an administrator-only refusal into its own error', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(403, '這是管理員功能')))

    const failure = await proxyUnderTest().listProfiles().catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(AdministratorRequiredError)
    expect((failure as Error).message).toBe('這是管理員功能')
  })
})

describe('SymbolScreeningProxy runs', () => {
  it('submits the pasted symbols as typed', async () => {
    const fetchMock = vi.fn().mockResolvedValue(RUN_WIRE)
    vi.stubGlobal('$fetch', fetchMock)

    const run = await proxyUnderTest().submitRun(new SymbolScreeningRunSubmissionDto(1, 'linkusdt，ADAUSDT'))

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-runs`, expect.objectContaining({
      method: 'POST', body: { profileId: 1, symbols: 'linkusdt，ADAUSDT' },
    }))
    expect([run.id, run.status, run.candidateCount]).toEqual([12, 'queued', 2])
    expect(run.finishedAt).toEqual(new Date('2026-10-19T09:00:00Z'))
  })

  it('lists the latest runs, in the background without the progress bar', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ runs: [{ ...RUN_WIRE, finishedAt: null }], totalCount: 1 })
    vi.stubGlobal('$fetch', fetchMock)
    const beginWaiting = vi.fn(() => () => {})

    const runs = await proxyUnderTest(new BackendRequestHooks(() => {}, async () => false, beginWaiting)).listRuns(true)

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-runs`,
      expect.objectContaining({ query: { limit: '50' } }))
    expect(runs[0]?.finishedAt).toBeNull()
    expect(beginWaiting).not.toHaveBeenCalled()
  })

  it('reads no runs from a null list', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ runs: null, totalCount: 0 }))

    expect(await proxyUnderTest().listRuns(false)).toEqual([])
  })

  it('reads a run with its snapshot and only the findings that exist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ...RUN_WIRE,
      snapshot: { ...TERMS_WIRE, profileName: '趨勢 V3', baselineSymbols: ['BTCUSDT'] },
      candidates: [
        {
          symbol: 'LINKUSDT', position: 2, status: 'passed', stage: '', reason: '', recommendationRank: 1,
          findings: {
            historyDays: 900,
            averageDailyQuoteVolume: '35000000',
            segments: [{
              startTime: '2024-01-01T00:00:00Z', endTime: '2024-09-01T00:00:00Z',
              returnRate: 0.2, maximumDrawdown: 0.1, closedTradeCount: 8, liquidationCount: 0,
            }],
            returnWithoutBestSegment: 0.176,
            contribution: {
              inMarketShare: 0.2, overlapShare: 0.1, baselineLongestGapDays: 95,
              combinedLongestGapDays: 60, gapReductionDays: 35,
            },
          },
        },
        { symbol: 'XRPUSDT', position: 1, status: 'rejected', stage: 'basicCondition', reason: '歷史太短',
          recommendationRank: null, findings: { historyDays: 120 } },
        { symbol: 'ADAUSDT', position: 3, status: 'waiting', stage: '', reason: '', recommendationRank: null,
          findings: null },
      ],
    })
    vi.stubGlobal('$fetch', fetchMock)

    const detail = await proxyUnderTest().getRun(12, false)

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-runs/12`, expect.anything())
    expect(detail.snapshot.terms.baselineSymbols).toEqual(['BTCUSDT'])
    const [linked, rejected, waiting] = detail.candidates
    expect(linked?.averageDailyQuoteVolume?.toString()).toBe('35000000')
    expect(linked?.segments[0]?.startTime).toEqual(new Date('2024-01-01T00:00:00Z'))
    expect(linked?.contribution?.gapReductionDays).toBe(35)
    expect(linked?.returnWithoutBestSegment).toBe(0.176)
    expect([rejected?.historyDays, rejected?.averageDailyQuoteVolume, rejected?.segments, rejected?.contribution,
      rejected?.returnWithoutBestSegment]).toEqual([120, null, [], null, null])
    expect(waiting?.historyDays).toBeNull()
  })

  it('reads a run without candidates yet', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      ...RUN_WIRE, snapshot: { ...TERMS_WIRE, profileName: '趨勢 V3' }, candidates: null,
    }))

    expect((await proxyUnderTest().getRun(12, true)).candidates).toEqual([])
  })

  it('cancels a run', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ...RUN_WIRE, status: 'cancelled' })
    vi.stubGlobal('$fetch', fetchMock)

    const run = await proxyUnderTest().cancelRun(12)

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/symbol-screening-runs/12/cancel`,
      expect.objectContaining({ method: 'POST' }))
    expect(run.status).toBe('cancelled')
  })

  it('turns cancelling an ended run into its own error', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(409, '這筆篩選已經結束，不能取消')))

    const failure = await proxyUnderTest().cancelRun(12).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(SymbolScreeningRunAlreadyEndedError)
    expect((failure as Error).message).toBe('這筆篩選已經結束，不能取消')
  })

  it.each([
    [429, '你已經有一筆篩選在排隊或進行中，等它結束再送'],
    [400, '篩選的要求不正確: BTC-USDT 只能有英文字母與數字'],
  ])('passes a %i refusal to cancel on unchanged', async (status, message) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(status, message)))

    const failure = await proxyUnderTest().cancelRun(12).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
    expect((failure as Error).message).toBe(message)
  })
})
