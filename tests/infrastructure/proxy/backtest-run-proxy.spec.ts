import { afterEach, describe, expect, it, vi } from 'vitest'
import { BacktestRunProxy } from '~/infrastructure/proxy/backtest-run-proxy'
import { BacktestRunListQueryDomain } from '~/domain/models/domains/backtest-run-list-query-domain'
import { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import { BacktestRunAlreadyEndedError } from '~/domain/errors/backtest-run-already-ended-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { queuedRunWire } from '../../fixtures/backtest-run'

const BASE_URL = 'http://localhost:8080'

function proxyUnderTest(hooks?: BackendRequestHooks) {
  return new BacktestRunProxy(BASE_URL, signedInSessionStorage(), hooks)
}

function rejectionOf(status: number, message: string) {
  return Object.assign(new Error(message), { response: { status }, data: { message } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('BacktestRunProxy 列出', () => {
  it('把狀態、來源與筆數都放進查詢字串', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ runs: [queuedRunWire()], totalCount: 25 })
    vi.stubGlobal('$fetch', fetchMock)

    const page = await proxyUnderTest().listRuns(
      new BacktestRunListQueryDomain(new BacktestRunListQueryDto('failed', 9, null, 20)), false)

    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/backtest-runs`, expect.objectContaining({
      method: 'GET',
      query: { status: 'failed', strategyScriptId: '9', limit: '20' },
    }))
    expect(page.totalCount).toBe(25)
    expect(page.runs[0]?.id).toBe(40)
    expect(page.runs[0]?.result).toBeNull()
  })

  it('沒有輪次時後端給 null 也收成空清單', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ runs: null, totalCount: 0 }))

    const page = await proxyUnderTest().listRuns(
      new BacktestRunListQueryDomain(new BacktestRunListQueryDto()), false)

    expect(page.runs).toEqual([])
  })

  it('背景那一發不讓頂端的進度條亮', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ runs: [], totalCount: 0 }))
    const beginWaiting = vi.fn(() => () => {})

    await proxyUnderTest(new BackendRequestHooks(() => {}, async () => false, beginWaiting)).listRuns(
      new BacktestRunListQueryDomain(new BacktestRunListQueryDto()), true)

    expect(beginWaiting).not.toHaveBeenCalled()
  })

  it('使用者自己按的那一發算在等', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ runs: [], totalCount: 0 }))
    const beginWaiting = vi.fn(() => () => {})

    await proxyUnderTest(new BackendRequestHooks(() => {}, async () => false, beginWaiting)).listRuns(
      new BacktestRunListQueryDomain(new BacktestRunListQueryDto()), false)

    expect(beginWaiting).toHaveBeenCalledTimes(1)
  })
})

describe('BacktestRunProxy 看一筆', () => {
  it('讀回輪次的每一格，槓桿不失精度', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      ...queuedRunWire({
        kind: 'contractScript', status: 'running', progressPercent: 40, leverage: '2.5', tradingMode: 'longOnly',
        strategyScriptId: 9, totalReturnRate: null,
      }),
      result: null,
    }))

    const run = await proxyUnderTest().getRun(40)

    expect(run.id).toBe(40)
    expect(run.status).toBe('running')
    expect(run.progressPercent).toBe(40)
    expect(run.leverage?.toString()).toBe('2.5')
    expect(run.tradingMode).toBe('longOnly')
    expect(run.strategyScriptId).toBe(9)
    expect(run.submittedAt).toEqual(new Date('2026-10-10T02:00:00Z'))
    expect(run.result).toBeNull()
  })

  it('完成的那一筆帶著結束時間與摘要', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      ...queuedRunWire({
        status: 'succeeded', finishedAt: '2026-10-10T02:05:00Z',
        totalReturnRate: 0.255, maximumDrawdown: 0.101, tradeCount: 4,
      }),
      result: null,
    }))

    const run = await proxyUnderTest().getRun(40)

    expect(run.finishedAt).toEqual(new Date('2026-10-10T02:05:00Z'))
    expect(run.totalReturnRate).toBe(0.255)
    expect(run.tradeCount).toBe(4)
  })
})

describe('BacktestRunProxy 取消', () => {
  it('打的是那一筆底下的取消入口，回的是改過狀態的那一筆', async () => {
    const fetchMock = vi.fn().mockResolvedValue(queuedRunWire({ id: 41, status: 'cancelled' }))
    vi.stubGlobal('$fetch', fetchMock)

    const run = await proxyUnderTest().cancelRun(41)

    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE_URL}/backtest-runs/41/cancel`)
    expect(fetchMock.mock.calls[0]![1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect(run.status).toBe('cancelled')
  })

  it('已經結束的那一筆自成一類，原話帶回', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(409, '這一筆已經結束了')))

    const failure = await proxyUnderTest().cancelRun(42).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BacktestRunAlreadyEndedError)
    expect((failure as BacktestRunAlreadyEndedError).localizedMessage.in('en')).toBe('這一筆已經結束了')
  })

  it('別的拒絕仍是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejectionOf(404, '找不到')))

    const failure = await proxyUnderTest().cancelRun(42).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
  })
})
