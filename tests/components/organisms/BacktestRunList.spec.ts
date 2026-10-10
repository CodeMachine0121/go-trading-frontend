import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestRunList from '~/components/organisms/BacktestRunList.vue'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { buildBacktestRun } from '../../fixtures/backtest-run'
import { buildTimeZone } from '../../fixtures/time-zone'

function runDto(overrides: Parameters<typeof buildBacktestRun>[0] = {}) {
  return buildBacktestRun(overrides).toDomain().toDto()
}

function mountList(props: Partial<InstanceType<typeof BacktestRunList>['$props']> = {}) {
  return mount(BacktestRunList, {
    props: {
      runs: [],
      totalCount: 0,
      loading: false,
      failureMessage: null,
      timeZone: buildTimeZone(),
      canShowMore: false,
      emptyMessage: '還沒有回測',
      ...props,
    },
  })
}

describe('BacktestRunList', () => {
  it('一筆都沒有時說那一句', () => {
    expect(mountList().get('[data-testid="backtest-run-list-empty"]').text()).toBe('還沒有回測')
  })

  it('讀不到時說原因', () => {
    const wrapper = mountList({ failureMessage: new LocalizedTextVo('讀不到', 'Unreadable') })

    expect(wrapper.get('[data-testid="backtest-run-list-failure"]').text()).toBe('讀不到')
  })

  it('每一列寫出編號、狀態、要跑什麼與送出時間', () => {
    const wrapper = mountList({ runs: [runDto({ id: 40, status: 'running', progressPercent: 40 })], totalCount: 1 })

    const row = wrapper.get('[data-testid="backtest-run-row"]')
    expect(row.text()).toContain('#40')
    expect(row.get('[data-testid="backtest-run-status"]').text()).toBe('進行中 · 40%')
    expect(row.get('[data-testid="backtest-run-description"]').text()).toContain('BTCUSDT · 一小時')
    expect(row.text()).toContain('2026-10-10 02:00')
  })

  it('完成的那一列寫摘要，還沒結束的不寫', () => {
    const wrapper = mountList({
      runs: [
        runDto({ id: 40, status: 'succeeded', totalReturnRate: 0.255, maximumDrawdown: 0.101, tradeCount: 4 }),
        runDto({ id: 41, status: 'queued' }),
      ],
      totalCount: 2,
    })

    const outcomes = wrapper.findAll('[data-testid="backtest-run-outcome"]')
    expect(outcomes).toHaveLength(1)
    expect(outcomes[0]!.text()).toBe('+25.5% · 最大回撤 10.1% · 4 筆')
  })

  it('排隊中與進行中有取消，結束的沒有', () => {
    const wrapper = mountList({
      runs: [runDto({ id: 41, status: 'queued' }), runDto({ id: 42, status: 'succeeded' })],
      totalCount: 2,
    })

    const rows = wrapper.findAll('[data-testid="backtest-run-row"]')
    expect(rows[0]!.find('[data-testid="backtest-run-cancel"]').exists()).toBe(true)
    expect(rows[1]!.find('[data-testid="backtest-run-cancel"]').exists()).toBe(false)
  })

  it('按取消往上說是哪一筆', async () => {
    const wrapper = mountList({ runs: [runDto({ id: 41, status: 'queued' })], totalCount: 1 })

    await wrapper.get('[data-testid="backtest-run-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toEqual([[41]])
  })

  it('點編號或查看都往上說要打開哪一筆', async () => {
    const wrapper = mountList({ runs: [runDto({ id: 40, status: 'succeeded' })], totalCount: 1 })

    await wrapper.get('[data-testid="backtest-run-open"]').trigger('click')
    await wrapper.get('[data-testid="backtest-run-view"]').trigger('click')

    expect(wrapper.emitted('open')).toEqual([[40], [40]])
  })

  it('說出顯示幾筆、共幾筆，翻得下去時才有那顆鍵', async () => {
    const wrapper = mountList({ runs: [runDto({ id: 40, status: 'succeeded' })], totalCount: 25, canShowMore: true })

    expect(wrapper.get('[data-testid="backtest-run-count"]').text()).toBe('顯示 1 筆，共 25 筆')
    await wrapper.get('[data-testid="backtest-run-show-more"]').trigger('click')
    expect(wrapper.emitted('showMore')).toHaveLength(1)
  })

  it('翻不下去時沒有那顆鍵', () => {
    const wrapper = mountList({ runs: [runDto({ id: 40, status: 'succeeded' })], totalCount: 1, canShowMore: false })

    expect(wrapper.find('[data-testid="backtest-run-show-more"]').exists()).toBe(false)
  })
})
