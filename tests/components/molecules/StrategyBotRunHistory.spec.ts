import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyBotRunHistory from '~/components/molecules/StrategyBotRunHistory.vue'
import { StrategyBotRunRecordDto } from '~/domain/models/dto/strategy-bot-run-record-dto'

function mountHistory(options: {
  runRecords?: StrategyBotRunRecordDto[]
  loading?: boolean
  failureMessage?: string
} = {}) {
  return mount(StrategyBotRunHistory, {
    props: {
      runRecords: options.runRecords ?? [],
      loading: options.loading ?? false,
      failureMessage: options.failureMessage ?? '',
      timeZoneIdentifier: 'Asia/Taipei',
    },
  })
}

function runRecord(runNumber: number, resultLabel: string, resultTone: 'success' | 'danger' | 'neutral') {
  return new StrategyBotRunRecordDto(
    runNumber, new Date('2026-09-16T05:05:00Z'), resultLabel, resultTone)
}

describe('StrategyBotRunHistory', () => {
  it('一輪一列，說得出第幾輪、什麼時候、結果是什麼', () => {
    const wrapper = mountHistory({
      runRecords: [runRecord(2, '買入', 'success'), runRecord(1, '持有', 'neutral')],
    })

    const rows = wrapper.findAll('[data-testid="run-history-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('Run 2')
    expect(rows[0]?.text()).toContain('買入')
    expect(rows[1]?.text()).toContain('Run 1')
  })

  it('時間用畫面選的那個時區說', () => {
    // 整個操作台只有一個顯示時區；各拿各的，同一頁上就會有兩份說法。
    const wrapper = mountHistory({ runRecords: [runRecord(1, '買入', 'success')] })

    // 台北是 UTC+8，所以 05:05Z 在畫面上是 13:05。
    expect(wrapper.text()).toContain('13:05')
  })

  it('還沒跑過時說得出下一步，而不是一張空表', () => {
    expect(mountHistory().get('[data-testid="run-history-empty"]').text())
      .toContain('還沒跑過')
  })

  it('讀不到時說出原因', () => {
    expect(mountHistory({ failureMessage: '後端連不上' })
      .get('[data-testid="run-history-failure"]').text()).toContain('後端連不上')
  })

  it('讀取中不會先顯示一張空表', () => {
    // 「還沒跑過」與「還沒讀完」是兩件事，先顯示前者會讓人以為它從沒跑過。
    const wrapper = mountHistory({ loading: true })

    expect(wrapper.find('[data-testid="run-history-empty"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('讀取中')
  })
})
