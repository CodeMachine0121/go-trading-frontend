// @vitest-environment nuxt
import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SymbolScreeningRunAlreadyEndedError } from '~/domain/errors/symbol-screening-run-already-ended-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { buildScreeningRun } from '../fixtures/symbol-screening'

const POLL_INTERVAL_MILLISECONDS = 3000

const applicationMock = {
  listRuns: vi.fn(),
  refreshRuns: vi.fn(),
  cancelRun: vi.fn(),
}

function runDto(id: number, status: string, processed = 0, total = 4) {
  return buildScreeningRun(id, status, { processed, total }).toDomain().toDto()
}

function runsUnderTest() {
  return useSymbolScreeningRuns(applicationMock as unknown as Parameters<typeof useSymbolScreeningRuns>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSymbolScreeningRuns', () => {
  it('follows the progress of a running screening', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    applicationMock.refreshRuns.mockResolvedValue([runDto(1, 'running', 2)])
    const list = runsUnderTest()
    await list.load()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(list.runs.value[0]?.processedCandidateCount).toBe(2)
  })

  it('asks at most once every 3 seconds while a screening is running', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    applicationMock.refreshRuns.mockResolvedValue([runDto(1, 'running', 2)])
    const list = runsUnderTest()
    await list.load()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS - 1)
    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.refreshRuns).toHaveBeenCalledTimes(3)
  })

  it('stops refreshing once every screening has ended', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'succeeded', 4)])
    const list = runsUnderTest()
    await list.load()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 3)

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })

  it('stops refreshing after leaving the page', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    const scope = effectScope()
    const list = scope.run(runsUnderTest)!
    await list.load()

    scope.stop()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })

  it('leaves the page quietly when nothing was being followed', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'succeeded', 4)])
    const scope = effectScope()
    const list = scope.run(runsUnderTest)!
    await list.load()

    scope.stop()

    expect(applicationMock.refreshRuns).not.toHaveBeenCalled()
  })

  it('keeps refreshing after one refresh fails and says why', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    applicationMock.refreshRuns
      .mockRejectedValueOnce(new Error('暫時讀不到'))
      .mockResolvedValue([runDto(1, 'succeeded', 4)])
    const list = runsUnderTest()
    await list.load()

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)
    expect(list.failureMessage.value?.in('zh-TW')).toBe('暫時讀不到')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    expect(list.runs.value[0]?.isActive).toBe(false)
  })

  it('puts a just-submitted screening on top', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'succeeded', 4)])
    const list = runsUnderTest()
    await list.load()

    list.prepend(runDto(2, 'queued', 0, 2))

    expect(list.runs.value.map(run => run.id)).toEqual([2, 1])
  })

  it('ignores a list that arrives after a newer submission', async () => {
    let resolveList: (runs: ReturnType<typeof runDto>[]) => void = () => {}
    applicationMock.listRuns.mockReturnValue(new Promise((resolve) => {
      resolveList = resolve
    }))
    const list = runsUnderTest()
    const loading = list.load()

    list.prepend(runDto(2, 'queued', 0, 2))
    resolveList([runDto(1, 'succeeded', 4)])
    await loading

    expect(list.runs.value.map(run => run.id)).toEqual([2])
  })

  it('ignores a failure that arrives after a newer submission', async () => {
    let rejectList: (error: Error) => void = () => {}
    applicationMock.listRuns.mockReturnValue(new Promise((_resolve, reject) => {
      rejectList = reject
    }))
    const list = runsUnderTest()
    const loading = list.load()

    list.prepend(runDto(2, 'succeeded', 2, 2))
    rejectList(new Error('讀不到'))
    await loading

    expect(list.failureMessage.value).toBeNull()
    expect(list.loading.value).toBe(false)
  })

  it('ignores a refresh that arrives after a newer submission', async () => {
    let resolveRefresh: (runs: ReturnType<typeof runDto>[]) => void = () => {}
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    applicationMock.refreshRuns.mockReturnValueOnce(new Promise((resolve) => {
      resolveRefresh = resolve
    })).mockResolvedValue([runDto(2, 'succeeded', 2, 2), runDto(1, 'succeeded', 4)])
    const list = runsUnderTest()
    await list.load()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    list.prepend(runDto(2, 'queued', 0, 2))
    resolveRefresh([runDto(1, 'running', 2)])
    await vi.advanceTimersByTimeAsync(0)

    expect(list.runs.value.map(run => run.id)).toEqual([2, 1])
    expect(list.runs.value[1]?.processedCandidateCount).toBe(1)
  })

  it('ignores a refresh failure that arrives after a newer submission', async () => {
    let rejectRefresh: (error: Error) => void = () => {}
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'running', 1)])
    applicationMock.refreshRuns.mockReturnValueOnce(new Promise((_resolve, reject) => {
      rejectRefresh = reject
    })).mockResolvedValue([runDto(1, 'succeeded', 4)])
    const list = runsUnderTest()
    await list.load()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS)

    list.prepend(runDto(2, 'queued', 0, 2))
    rejectRefresh(new Error('暫時讀不到'))
    await vi.advanceTimersByTimeAsync(0)

    expect(list.failureMessage.value).toBeNull()
  })

  it('says why a cancel was refused without reloading', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'queued')])
    applicationMock.cancelRun.mockRejectedValue(new Error('找不到這筆篩選'))
    const list = runsUnderTest()
    await list.load()

    await list.cancel(1)

    expect(list.failureMessage.value?.in('zh-TW')).toBe('找不到這筆篩選')
    expect(applicationMock.listRuns).toHaveBeenCalledTimes(1)
  })

  it('replaces one run and leaves the others', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(2, 'queued'), runDto(1, 'succeeded')])
    const list = runsUnderTest()
    await list.load()

    list.replace(runDto(2, 'cancelled'))

    expect(list.runs.value.map(run => run.statusLabel.traditionalChinese)).toEqual(['已取消', '完成'])
  })

  it('shows a cancelled screening as cancelled', async () => {
    applicationMock.listRuns.mockResolvedValue([runDto(1, 'queued')])
    applicationMock.cancelRun.mockResolvedValue(runDto(1, 'cancelled'))
    const list = runsUnderTest()
    await list.load()

    await list.cancel(1)

    expect([list.runs.value[0]?.statusLabel.traditionalChinese, list.runs.value[0]?.isActive]).toEqual(['已取消', false])
  })

  it('says a screening already ended and shows its real outcome', async () => {
    applicationMock.listRuns
      .mockResolvedValueOnce([runDto(1, 'running', 3)])
      .mockResolvedValueOnce([runDto(1, 'succeeded', 4)])
    applicationMock.cancelRun.mockRejectedValue(new SymbolScreeningRunAlreadyEndedError('這筆篩選已經結束，不能取消'))
    const list = runsUnderTest()
    await list.load()

    await list.cancel(1)

    expect(list.failureMessage.value?.in('zh-TW')).toBe('這筆篩選已經結束，不能取消')
    expect(list.runs.value[0]?.statusLabel.traditionalChinese).toBe('完成')
  })

  it('says the trading service is unreachable', async () => {
    applicationMock.listRuns.mockRejectedValue(new BackendUnreachableError('/symbol-screening-runs'))
    const list = runsUnderTest()

    await list.load()

    expect(list.failureMessage.value?.in('zh-TW')).toBe('連不上交易服務，請稍後再試')
  })

  it('says something unexpected happened for a failure that is not an error', async () => {
    applicationMock.listRuns.mockRejectedValue('odd')
    const list = runsUnderTest()

    await list.load()

    expect(list.failureMessage.value?.in('zh-TW')).toBe('發生了未預期的錯誤')
  })
})
