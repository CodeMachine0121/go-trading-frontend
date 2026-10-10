// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { IBacktestRunProxy } from '~/domain/interface/i-backtest-run-proxy'
import type { BacktestRun } from '~/domain/models/entities/backtest-run'
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

  it('先點 A 再點 B、A 比較晚回來，畫面上仍是 B', async () => {
    let finishFirst: (run: BacktestRun) => void = () => {}
    const getRun = vi.fn()
      .mockReturnValueOnce(new Promise<BacktestRun>((resolve) => {
        finishFirst = resolve
      }))
      .mockResolvedValueOnce(buildBacktestRun({ id: 44, status: 'cancelled' }))
    const detail = detailUnderTest(buildBacktestRunProxy({ getRun }))

    const openingFirst = detail.openRun(43)
    await detail.openRun(44)
    finishFirst(buildBacktestRun({ id: 43, status: 'failed', failureReason: '超過時間上限' }))
    await openingFirst

    expect(detail.detail.value?.run.id).toBe(44)
    expect(detail.loading.value).toBe(false)
  })

  it('先點 A 再點 B、A 晚回來時讀不到，也不把 A 的原因寫到 B 上', async () => {
    let failFirst: (error: Error) => void = () => {}
    const getRun = vi.fn()
      .mockReturnValueOnce(new Promise<BacktestRun>((_resolve, reject) => {
        failFirst = reject
      }))
      .mockResolvedValueOnce(buildBacktestRun({ id: 44, status: 'cancelled' }))
    const detail = detailUnderTest(buildBacktestRunProxy({ getRun }))

    const openingFirst = detail.openRun(43)
    await detail.openRun(44)
    failFirst(new Error('找不到這一筆'))
    await openingFirst

    expect(detail.detail.value?.run.id).toBe(44)
    expect(detail.failureMessage.value).toBeNull()
  })

  it('關上就不再開著', async () => {
    const detail = detailUnderTest(buildBacktestRunProxy())
    await detail.openRun(40)

    detail.close()

    expect(detail.open.value).toBe(false)
  })
})
