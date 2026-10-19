// @vitest-environment nuxt
import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildCandidate, buildRunDetail, buildScreeningRun } from '../fixtures/symbol-screening'

const POLL_INTERVAL_MILLISECONDS = 3000

const applicationMock = {
  getRun: vi.fn(),
  refreshRun: vi.fn(),
}

function detailDto(status: string, symbols: string[]) {
  return buildRunDetail(buildScreeningRun(12, status), symbols.map(symbol => buildCandidate(symbol, 'waiting'))).toDto()
}

function detailUnderTest() {
  return useSymbolScreeningRunDetail(applicationMock as unknown as Parameters<typeof useSymbolScreeningRunDetail>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useSymbolScreeningRunDetail', () => {
  it('lists a running screening in pasted order and follows it until it ends', async () => {
    applicationMock.getRun.mockResolvedValue(detailDto('running', ['XRPUSDT', 'LINKUSDT']))
    applicationMock.refreshRun
      .mockResolvedValueOnce(detailDto('running', ['XRPUSDT', 'LINKUSDT']))
      .mockResolvedValueOnce(detailDto('succeeded', ['LINKUSDT', 'XRPUSDT']))
    const detail = detailUnderTest()

    await detail.openRun(12)
    expect(detail.detail.value?.candidates.map(candidate => candidate.symbol)).toEqual(['XRPUSDT', 'LINKUSDT'])
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(detail.detail.value?.run.isActive).toBe(false)
    expect(detail.detail.value?.candidates.map(candidate => candidate.symbol)).toEqual(['LINKUSDT', 'XRPUSDT'])
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)
    expect(applicationMock.refreshRun).toHaveBeenCalledTimes(2)
  })

  it('does not follow an ended screening', async () => {
    applicationMock.getRun.mockResolvedValue(detailDto('succeeded', ['LINKUSDT']))
    const detail = detailUnderTest()

    await detail.openRun(12)
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.refreshRun).not.toHaveBeenCalled()
    expect(detail.loading.value).toBe(false)
  })

  it('stops following once closed', async () => {
    applicationMock.getRun.mockResolvedValue(detailDto('running', ['LINKUSDT']))
    const detail = detailUnderTest()
    await detail.openRun(12)

    detail.close()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(detail.open.value).toBe(false)
    expect(applicationMock.refreshRun).not.toHaveBeenCalled()
  })

  it('stops following after leaving the page', async () => {
    applicationMock.getRun.mockResolvedValue(detailDto('running', ['LINKUSDT']))
    const scope = effectScope()
    const detail = scope.run(detailUnderTest)!
    await detail.openRun(12)

    scope.stop()
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MILLISECONDS * 2)

    expect(applicationMock.refreshRun).not.toHaveBeenCalled()
  })

  it('drops a reply about a screening closed before it arrived', async () => {
    let resolveRun: (detail: ReturnType<typeof detailDto>) => void = () => {}
    applicationMock.getRun.mockReturnValue(new Promise((resolve) => {
      resolveRun = resolve
    }))
    const detail = detailUnderTest()
    const opening = detail.openRun(12)

    detail.close()
    resolveRun(detailDto('running', ['LINKUSDT']))
    await opening

    expect(detail.detail.value).toBeNull()
  })

  it('drops a failure about a screening closed before it arrived', async () => {
    let rejectRun: (error: Error) => void = () => {}
    applicationMock.getRun.mockReturnValue(new Promise((_resolve, reject) => {
      rejectRun = reject
    }))
    const detail = detailUnderTest()
    const opening = detail.openRun(12)

    detail.close()
    rejectRun(new Error('找不到這筆篩選'))
    await opening

    expect([detail.failureMessage.value, detail.loading.value]).toEqual([null, false])
  })

  it('says why a screening could not be read', async () => {
    applicationMock.getRun.mockRejectedValue(new Error('找不到這筆篩選'))
    const detail = detailUnderTest()

    await detail.openRun(12)

    expect(detail.failureMessage.value?.in('zh-TW')).toBe('找不到這筆篩選')
    expect(detail.loading.value).toBe(false)
  })

  it('reads the screening again on request', async () => {
    applicationMock.getRun
      .mockResolvedValueOnce(detailDto('running', ['LINKUSDT']))
      .mockResolvedValueOnce(detailDto('cancelled', ['LINKUSDT']))
    const detail = detailUnderTest()
    await detail.openRun(12)

    await detail.refresh()

    expect(detail.detail.value?.run.statusLabel.traditionalChinese).toBe('已取消')
  })

  it('reads nothing when nothing is open', async () => {
    const detail = detailUnderTest()

    await detail.refresh()

    expect(applicationMock.getRun).not.toHaveBeenCalled()
  })
})
