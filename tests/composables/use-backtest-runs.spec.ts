// @vitest-environment nuxt
import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import { BacktestRunPageDto } from '~/domain/models/dto/backtest-run-page-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BacktestRunAlreadyEndedError } from '~/domain/errors/backtest-run-already-ended-error'
import { buildBacktestRun } from '../fixtures/backtest-run'

/** 有輪次還沒結束時，列表每隔這麼久回頭重讀一次。與 composable 裡那個常數同一個值。 */
const POLL_INTERVAL_MILLISECONDS = 3000

const applicationMock = {
  listRuns: vi.fn(),
  refreshRuns: vi.fn(),
  cancelRun: vi.fn(),
  grownQuery: vi.fn((query: BacktestRunListQueryDto) => query.withLimit((query.limit ?? 20) + 20)),
  canShowMoreRuns: vi.fn(
    (query: BacktestRunListQueryDto, shown: number, total: number) => shown < total && (query.limit ?? 20) < 200),
}

function runDto(id: number, status: string, progressPercent = 0) {
  return buildBacktestRun({ id, status, progressPercent }).toDomain().toDto()
}

function pageOf(...runs: ReturnType<typeof runDto>[]) {
  return new BacktestRunPageDto(runs, runs.length)
}

function runsUnderTest(scope = new BacktestRunListQueryDto()) {
  return useBacktestRuns(applicationMock as unknown as Parameters<typeof useBacktestRuns>[0], scope)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  applicationMock.listRuns.mockResolvedValue(pageOf(runDto(40, 'succeeded')))
  applicationMock.refreshRuns.mockResolvedValue(pageOf(runDto(40, 'succeeded')))
  applicationMock.cancelRun.mockResolvedValue(runDto(41, 'cancelled'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useBacktestRuns 載入', () => {
  it('讀回清單與總數', async () => {
    applicationMock.listRuns.mockResolvedValue(new BacktestRunPageDto([runDto(40, 'succeeded')], 25))
    const list = runsUnderTest()

    await list.load()

    expect(list.runs.value.map(run => run.id)).toEqual([40])
    expect(list.totalCount.value).toBe(25)
    expect(list.loading.value).toBe(false)
  })

  it('讀不到時說得出原因', async () => {
    applicationMock.listRuns.mockRejectedValue(new Error('後端連不上'))
    const list = runsUnderTest()

    await list.load()

    expect(list.failureMessage.value?.in('zh-TW')).toBe('後端連不上')
  })

  it('連不上後端時明說連不上', async () => {
    applicationMock.listRuns.mockRejectedValue(new BackendUnreachableError('/backtest-runs'))
    const list = runsUnderTest()

    await list.load()

    expect(list.failureMessage.value?.in('zh-TW')).toContain('連不上後端')
  })

  it('範圍是哪一支腳本就照那一支問', async () => {
    const list = runsUnderTest(new BacktestRunListQueryDto(null, 9))

    await list.load()

    expect(applicationMock.listRuns.mock.calls[0]![0]).toEqual(
      expect.objectContaining({ strategyScriptId: 9 }))
  })
})

describe('useBacktestRuns 自己跟著進度', () => {
  it('全部結束就不回頭問', async () => {
    const list = runsUnderTest()
    await list.load()

    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })

  it('有在跑的就每隔三秒走背景那一條重讀，直到全部結束', async () => {
    applicationMock.listRuns.mockResolvedValue(pageOf(runDto(40, 'running', 40)))
    applicationMock.refreshRuns
      .mockResolvedValueOnce(pageOf(runDto(40, 'running', 70)))
      .mockResolvedValueOnce(pageOf(runDto(40, 'succeeded')))
    const list = runsUnderTest()
    await list.load()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)
    expect(list.runs.value[0]?.progressPercent).toBe(70)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)
    expect(list.runs.value[0]?.status).toBe('succeeded')

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)
    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(2)
  })

  it('剛送出的那一筆插到最上面，也讓它開始跟', async () => {
    const list = runsUnderTest()
    await list.load()

    list.prepend(runDto(41, 'queued'))

    expect(list.runs.value.map(run => run.id)).toEqual([41, 40])
    expect(list.totalCount.value).toBe(2)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)
    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(1)
  })

  it('停下來之後那一次就不問了', async () => {
    applicationMock.listRuns.mockResolvedValue(pageOf(runDto(40, 'running', 40)))
    const list = runsUnderTest()
    await list.load()

    list.stopPolling()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })
})

describe('useBacktestRuns 離開畫面', () => {
  it('離開之後排好的那一次不再問', async () => {
    applicationMock.listRuns.mockResolvedValue(pageOf(runDto(40, 'running', 40)))
    const scope = effectScope()
    const list = scope.run(() => runsUnderTest())!
    await list.load()

    scope.stop()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })

  it('離開時還在路上的那一次回來之後，也不再排下一次', async () => {
    applicationMock.listRuns.mockResolvedValue(pageOf(runDto(40, 'running', 40)))
    let finishRefresh: (page: BacktestRunPageDto) => void = () => {}
    applicationMock.refreshRuns.mockImplementationOnce(() => new Promise<BacktestRunPageDto>((resolve) => {
      finishRefresh = resolve
    }))
    const scope = effectScope()
    const list = scope.run(() => runsUnderTest())!
    await list.load()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)
    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(1)

    scope.stop()
    finishRefresh(pageOf(runDto(40, 'running', 60)))
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)

    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(1)
  })
})

describe('useBacktestRuns 取消與翻頁', () => {
  it('取消之後那一列換成後端回的樣子', async () => {
    applicationMock.listRuns.mockResolvedValue(pageOf(runDto(41, 'queued')))
    const list = runsUnderTest()
    await list.load()

    await list.cancel(41)

    expect(applicationMock.cancelRun).toHaveBeenCalledWith(41)
    expect(list.runs.value[0]?.status).toBe('cancelled')
  })

  it('已經結束的取消不了，說出原因、清單不變', async () => {
    applicationMock.cancelRun.mockRejectedValue(new BacktestRunAlreadyEndedError('這一筆已經結束了'))
    const list = runsUnderTest()
    await list.load()

    await list.cancel(40)

    expect(list.failureMessage.value?.in('zh-TW')).toBe('這一筆已經結束了')
    expect(list.runs.value[0]?.status).toBe('succeeded')
  })

  it('再顯示更多就把上限往上加再讀一次', async () => {
    applicationMock.listRuns.mockResolvedValue(new BacktestRunPageDto([runDto(40, 'succeeded')], 25))
    const list = runsUnderTest()
    await list.load()
    expect(list.canShowMore.value).toBe(true)

    await list.showMore()

    expect(applicationMock.listRuns.mock.calls[1]![0]).toEqual(expect.objectContaining({ limit: 40 }))
  })
})
