import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import { SymbolScreeningService } from '~/domain/service/symbol-screening-service'
import type { ISymbolScreeningProxy } from '~/domain/interface/i-symbol-screening-proxy'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { SymbolScreeningProfileWriteDomain } from '~/domain/models/domains/symbol-screening-profile-write-domain'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { SymbolScreeningProfile } from '~/domain/models/entities/symbol-screening-profile'
import { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import { SymbolScreeningRunSubmissionDto } from '~/domain/models/dto/symbol-screening-run-submission-dto'
import { SymbolScreeningContributionVo } from '~/domain/models/vo/symbol-screening-contribution-vo'
import {
  buildCandidate, buildProfileWriteDto, buildRunDetail, buildScreeningProfile, buildScreeningRun,
} from '../fixtures/symbol-screening'

function screeningProxyMock(): { [Method in keyof ISymbolScreeningProxy]: ReturnType<typeof vi.fn> } {
  return {
    listProfiles: vi.fn(),
    saveProfile: vi.fn(),
    deleteProfile: vi.fn(),
    submitRun: vi.fn(),
    listRuns: vi.fn(),
    getRun: vi.fn(),
    cancelRun: vi.fn(),
  }
}

function applicationUnderTest(
  screeningProxy = screeningProxyMock(),
  strategyScriptProxy: Partial<IStrategyScriptProxy> = {},
) {
  return new SymbolScreeningApplication(new SymbolScreeningService(
    screeningProxy as unknown as ISymbolScreeningProxy,
    strategyScriptProxy as IStrategyScriptProxy,
  ))
}

describe('SymbolScreeningApplication profiles', () => {
  it('offers only the 4-hour and daily intervals', () => {
    expect(applicationUnderTest().listAggregationIntervalOptions().map(option => option.value)).toEqual(['4h', '1d'])
  })

  it('offers long only, short only and long & short trading modes', () => {
    expect(applicationUnderTest().listTradingModeOptions().map(option => option.value))
      .toEqual(expect.arrayContaining(['longOnly', 'shortOnly', 'longShort']))
  })

  it('lists only own contract signal scripts that need no order flow', async () => {
    const application = applicationUnderTest(screeningProxyMock(), {
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({
        mine: [
          new StrategyScript(1, '現貨 V1', '', 'script', 'signal', [], false, 'kCandle'),
          new StrategyScript(2, 'V3', '', 'script', 'signal', [], false, 'contractKCandle'),
          new StrategyScript(3, '訂單流', '', 'script', 'signal',
            [new StrategyScriptParameterDto('step', 'orderFlowPriceStep', 1)], false, 'contractKCandle'),
          new StrategyScript(4, '均線', '', 'script', 'floatList', [], false, 'contractKCandle'),
        ],
        adopted: [],
      }),
    })

    const strategyScripts = await application.listScreenableStrategyScripts()

    expect(strategyScripts.map(strategyScript => strategyScript.name)).toEqual(['V3'])
  })

  it('leaves blank figures unsent and shows the figures the system filled in', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.saveProfile.mockResolvedValue(buildScreeningProfile())

    const saved = await applicationUnderTest(screeningProxy).saveProfile(buildProfileWriteDto())

    const sent = screeningProxy.saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDomain
    expect([sent.historyDays, sent.segmentCount, sent.minimumTradeCount, sent.leverage,
      sent.entryCostPercentage, sent.slippagePercentage, sent.minimumAverageDailyQuoteVolume])
      .toEqual([null, null, null, null, null, null, null])
    expect(saved.terms.historyDays).toBe(730)
    expect(saved.terms.segmentCount).toBe(3)
    expect(saved.terms.minimumTradeCount).toBe(6)
    expect(saved.terms.minimumAverageDailyQuoteVolume.equals(new Decimal('20000000'))).toBe(true)
    expect(saved.terms.tradingModeLabel.traditionalChinese).toBe('只做多')
    expect(saved.terms.aggregationIntervalLabel.traditionalChinese).toBe('四小時')
  })

  it('names an interval it does not know as the system wrote it', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.listProfiles.mockResolvedValue([new SymbolScreeningProfile(1, '舊設定', 9, [], new SymbolScreeningTerms(
      '2h', 'longOnly', new Decimal(1), new Decimal(0.05), new Decimal(0.05), 730, 3, 6, new Decimal(20000000), []))])

    const [profile] = await applicationUnderTest(screeningProxy).listProfiles()

    expect(profile?.terms.aggregationIntervalLabel.traditionalChinese).toBe('2h')
  })

  it.each([
    ['btcusdt, ETHUSDT', ['BTCUSDT', 'ETHUSDT']],
    ['btcusdt，ETHUSDT,', ['BTCUSDT', 'ETHUSDT']],
    ['', []],
  ])('reads baseline symbols "%s" as %j', async (typed, expected) => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.saveProfile.mockResolvedValue(buildScreeningProfile())

    await applicationUnderTest(screeningProxy).saveProfile(buildProfileWriteDto({ baselineSymbols: typed }))

    expect((screeningProxy.saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDomain).baselineSymbols)
      .toEqual(expected)
  })

  it('sends an edited history of 365 days for that profile', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.saveProfile.mockResolvedValue(buildScreeningProfile(1, '趨勢 V3', 365))

    const saved = await applicationUnderTest(screeningProxy)
      .saveProfile(buildProfileWriteDto({ id: 1, historyDays: ' 365 ' }))

    const sent = screeningProxy.saveProfile.mock.calls[0]?.[0] as SymbolScreeningProfileWriteDomain
    expect([sent.id, sent.historyDays]).toEqual([1, 365])
    expect(saved.terms.historyDays).toBe(365)
  })
})

describe('SymbolScreeningApplication runs', () => {
  it('reports a just-submitted run as queued with 0 of 2 processed and cancellable', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.submitRun.mockResolvedValue(buildScreeningRun(12, 'queued'))

    const run = await applicationUnderTest(screeningProxy)
      .submitRun(new SymbolScreeningRunSubmissionDto(1, 'linkusdt，ADAUSDT'))

    expect(screeningProxy.submitRun).toHaveBeenCalledWith(new SymbolScreeningRunSubmissionDto(1, 'linkusdt，ADAUSDT'))
    expect([run.statusLabel.traditionalChinese, run.processedCandidateCount, run.candidateCount, run.isActive])
      .toEqual(['排隊中', 0, 2, true])
  })

  it.each([
    ['queued', '排隊中', true],
    ['running', '進行中', true],
    ['succeeded', '完成', false],
    ['failed', '失敗', false],
    ['cancelled', '已取消', false],
    ['mystery', '失敗', false],
  ])('reads status %s as %s, cancellable %s', async (status, label, active) => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.listRuns.mockResolvedValue([buildScreeningRun(1, status)])

    const [run] = await applicationUnderTest(screeningProxy).listRuns()

    expect([run?.statusLabel.traditionalChinese, run?.isActive]).toEqual([label, active])
  })

  it('carries the failure reason of a failed run', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.listRuns.mockResolvedValue([buildScreeningRun(1, 'failed', { failureReason: '超過時間上限' })])

    const [run] = await applicationUnderTest(screeningProxy).refreshRuns()

    expect(run?.failureReason).toBe('超過時間上限')
    expect(screeningProxy.listRuns).toHaveBeenCalledWith(true)
  })

  it('reports a cancelled run as no longer cancellable', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.cancelRun.mockResolvedValue(buildScreeningRun(12, 'cancelled'))

    const run = await applicationUnderTest(screeningProxy).cancelRun(12)

    expect([run.statusLabel.traditionalChinese, run.isActive]).toEqual(['已取消', false])
  })
})

describe('SymbolScreeningApplication run detail', () => {
  async function detailOf(...candidates: ReturnType<typeof buildCandidate>[]) {
    const screeningProxy = screeningProxyMock()
    screeningProxy.getRun.mockResolvedValue(buildRunDetail(buildScreeningRun(12, 'succeeded'), candidates))

    return applicationUnderTest(screeningProxy).getRun(12)
  }

  it('keeps the recommendation order the system gave', async () => {
    const detail = await detailOf(
      buildCandidate('LINKUSDT', 'passed', { rank: 1 }),
      buildCandidate('FOOUSDT', 'rejected', { rank: 2 }),
    )

    expect(detail.candidates.map(candidate => candidate.symbol)).toEqual(['LINKUSDT', 'FOOUSDT'])
  })

  it('says a rejection stuck at the basic conditions with its reason', async () => {
    const detail = await detailOf(buildCandidate('FOOUSDT', 'rejected', {
      stage: 'basicCondition', reason: '幣安沒有這個 USDT 永續合約',
    }))

    const [candidate] = detail.candidates
    expect([candidate?.statusLabel.traditionalChinese, candidate?.stageLabel?.traditionalChinese, candidate?.reason])
      .toEqual(['淘汰', '基本條件', '幣安沒有這個 USDT 永續合約'])
  })

  it('names the portability stage', async () => {
    const detail = await detailOf(buildCandidate('FOOUSDT', 'rejected', { stage: 'portability' }))

    expect(detail.candidates[0]?.stageLabel?.traditionalChinese).toBe('策略移植')
  })

  it('shows each segment return and the return without the best segment', async () => {
    const detail = await detailOf(buildCandidate('LINKUSDT', 'passed', {
      segmentReturns: [0.2, 0.05, 0.12], returnWithoutBestSegment: 0.176,
    }))

    const [candidate] = detail.candidates
    expect(candidate?.segments.map(segment => segment.returnText)).toEqual(['+20.0%', '+5.0%', '+12.0%'])
    expect(candidate?.returnWithoutBestSegmentText).toBe('+17.6%')
  })

  it('shows a losing segment with its minus sign and drawdown unsigned', async () => {
    const detail = await detailOf(buildCandidate('LINKUSDT', 'passed', { segmentReturns: [-0.034] }))

    expect(detail.candidates[0]?.segments[0]?.returnText).toBe('-3.4%')
    expect(detail.candidates[0]?.segments[0]?.maximumDrawdownText).toBe('10.0%')
  })

  it('shows how many days the longest gap shrinks', async () => {
    const detail = await detailOf(buildCandidate('LINKUSDT', 'passed', {
      contribution: new SymbolScreeningContributionVo(0.175, 0.25, 95, 60, 35),
    }))

    const contribution = detail.candidates[0]?.contribution
    expect([contribution?.gapReductionDays, contribution?.inMarketShareText, contribution?.overlapShareText])
      .toEqual([35, '17.5%', '25.0%'])
  })

  it('carries why the portfolio could not be compared while the candidate still passes', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.getRun.mockResolvedValue(buildRunDetail(
      buildScreeningRun(12, 'succeeded', { contributionFailureReason: '現有組合標的 BTCUSDT 無法比較：目前沒有在交易' }),
      [buildCandidate('LINKUSDT', 'passed')]))

    const detail = await applicationUnderTest(screeningProxy).refreshRun(12)

    expect(detail.run.contributionFailureReason).toBe('現有組合標的 BTCUSDT 無法比較：目前沒有在交易')
    expect(detail.candidates[0]?.statusLabel.traditionalChinese).toBe('通過')
    expect(screeningProxy.getRun).toHaveBeenCalledWith(12, true)
  })

  it('has only the figures that exist', async () => {
    const detail = await detailOf(buildCandidate('XRPUSDT', 'rejected', { historyDays: 120 }))

    const [candidate] = detail.candidates
    expect([candidate?.historyDays, candidate?.averageDailyQuoteVolumeText, candidate?.segments.length,
      candidate?.returnWithoutBestSegmentText, candidate?.contribution]).toEqual([120, null, 0, null, null])
  })

  it('groups the average daily quote volume in thousands', async () => {
    const detail = await detailOf(buildCandidate('XRPUSDT', 'passed', { averageDailyQuoteVolume: new Decimal('35000000.4') }))

    expect(detail.candidates[0]?.averageDailyQuoteVolumeText).toBe('35,000,000')
  })

  it('shows the profile as it was when submitted', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.getRun.mockResolvedValue(buildRunDetail(buildScreeningRun(12, 'succeeded'), [], 730))

    const detail = await applicationUnderTest(screeningProxy).getRun(12)

    expect(detail.snapshot.terms.historyDays).toBe(730)
    expect(screeningProxy.getRun).toHaveBeenCalledWith(12, false)
  })

  it.each([
    ['unfinished', '無法完成', '行情取不到'],
    ['mystery', '無法完成', ''],
    ['waiting', '等待中', ''],
    ['processing', '處理中', ''],
    ['cancelled', '已取消', ''],
  ])('reads candidate status %s as %s', async (status, label, reason) => {
    const detail = await detailOf(buildCandidate('XRPUSDT', status, { reason }))

    expect(detail.candidates[0]?.statusLabel.traditionalChinese).toBe(label)
    expect(detail.candidates[0]?.reason).toBe(reason === '' ? null : reason)
  })
})

describe('SymbolScreeningApplication pass-through', () => {
  it('lists profiles and deletes one', async () => {
    const screeningProxy = screeningProxyMock()
    screeningProxy.listProfiles.mockResolvedValue([buildScreeningProfile()])
    screeningProxy.deleteProfile.mockResolvedValue(undefined)
    const application = applicationUnderTest(screeningProxy)

    const profiles = await application.listProfiles()
    await application.deleteProfile(1)

    expect(profiles.map(profile => profile.name)).toEqual(['趨勢 V3'])
    expect(screeningProxy.deleteProfile).toHaveBeenCalledWith(1)
  })
})
