import { describe, expect, it } from 'vitest'
import { BacktestRunListQueryDomain } from '~/domain/models/domains/backtest-run-list-query-domain'
import { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'

describe('BacktestRunListQueryDomain', () => {
  it.each([
    { declared: null, expected: 20 },
    { declared: 50, expected: 50 },
    { declared: 500, expected: 200 },
    { declared: 0, expected: 1 },
  ])('最多幾筆 $declared → $expected', ({ declared, expected }) => {
    expect(new BacktestRunListQueryDomain(new BacktestRunListQueryDto(null, null, null, declared)).limit).toBe(expected)
  })

  it('翻下一頁就是上限再加二十，頂到兩百為止', () => {
    const grown = new BacktestRunListQueryDomain(new BacktestRunListQueryDto('failed', 9, null, 190)).grown()

    expect(grown.limit).toBe(200)
    expect(grown.status).toBe('failed')
    expect(grown.strategyScriptId).toBe(9)
  })

  it.each([
    { shown: 20, total: 25, limit: 20, canShowMore: true },
    { shown: 25, total: 25, limit: 40, canShowMore: false },
    { shown: 200, total: 300, limit: 200, canShowMore: false },
  ])('顯示 $shown／共 $total、上限 $limit → 還翻得下去：$canShowMore', ({ shown, total, limit, canShowMore }) => {
    expect(new BacktestRunListQueryDomain(new BacktestRunListQueryDto(null, null, null, limit))
      .canShowMore(shown, total)).toBe(canShowMore)
  })
})
