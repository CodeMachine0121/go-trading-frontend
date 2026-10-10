// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import { buildBacktestProxy, buildBacktestRun, buildBacktestRunProxy } from '../fixtures/backtest-run'

function detailUnderTest(runProxy: IBacktestRunProxy) {
  return useBacktestRunDetail(new BacktestApplication(new BacktestService(buildBacktestProxy(), runProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useBacktestRunDetail', () => {
  it('點開一筆就取回它的明細', async () => {
    const runProxy = buildBacktestRunProxy({
      getRun: vi.fn().mockResolvedValue(buildBacktestRun({ id: 43, status: 'failed', failureReason: '超過時間上限' })),
    })
    const detail = detailUnderTest(runProxy)

    await detail.openRun(43)

    expect(runProxy.getRun).toHaveBeenCalledWith(43)
    expect(detail.open.value).toBe(true)
    expect(detail.detail.value?.run.outcome?.in('zh-TW')).toBe('失敗：超過時間上限')
    expect(detail.loading.value).toBe(false)
  })

  it.each([
    { error: new BackendUnreachableError('/backtest-runs/40'), expected: '連不上後端' },
    { error: new Error('找不到這一筆'), expected: '找不到這一筆' },
    { error: 'weird', expected: '讀取回測紀錄時發生未預期的錯誤' },
  ])('讀不到時說原因：$expected', async ({ error, expected }) => {
    const detail = detailUnderTest(buildBacktestRunProxy({ getRun: vi.fn().mockRejectedValue(error) }))

    await detail.openRun(40)

    expect(detail.detail.value).toBeNull()
    expect(detail.failureMessage.value?.in('zh-TW')).toContain(expected)
  })

  it('關上就不再開著', async () => {
    const detail = detailUnderTest(buildBacktestRunProxy())
    await detail.openRun(40)

    detail.close()

    expect(detail.open.value).toBe(false)
  })
})
