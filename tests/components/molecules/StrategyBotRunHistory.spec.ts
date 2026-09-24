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

function runRecord(
  runNumber: number,
  resultLabel: string,
  resultTone: 'success' | 'danger' | 'neutral' | 'warning',
  needsAttention = false,
  suggestionText: string | null = null,
) {
  return new StrategyBotRunRecordDto(
    runNumber, new Date('2026-09-16T05:05:00Z'), resultLabel, resultTone, needsAttention,
    suggestionText)
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

  it('要人去處理的那一輪自己說出下一步', () => {
    // 只多一個詞而不說要做什麼的話，讀的人還是得自己想。
    const wrapper = mountHistory({
      runRecords: [runRecord(7, '衝突', 'warning', true)],
    })

    expect(wrapper.get('[data-testid="run-history-attention"]').text())
      .toContain('同時成立')
  })

  it('其餘的那幾輪不說那句話——一排紀錄裡每一列都在講話等於沒有一列在講話', () => {
    const wrapper = mountHistory({ runRecords: [runRecord(7, '持有', 'neutral')] })

    expect(wrapper.find('[data-testid="run-history-attention"]').exists()).toBe(false)
  })

  it('要人去處理的那一列在旁邊留一個記號，好讓人用掃的就找得到', () => {
    const wrapper = mountHistory({
      runRecords: [runRecord(7, '持有', 'neutral'), runRecord(8, '衝突', 'warning', true)],
    })

    const rows = wrapper.findAll('[data-testid="run-history-row"]')
    expect(rows[0]!.classes()).not.toContain('strategy-bot-run-history__row--needs-attention')
    expect(rows[1]!.classes()).toContain('strategy-bot-run-history__row--needs-attention')
  })
})

// 那一輪建議過的數字是它的來歷：使用者手機上收到一則訊息、照著做了，
// 三天後想確認當時是什麼數字——而他那期間可能已經改過停損距離了。
describe('StrategyBotRunHistory 那一輪建議過什麼', () => {
  it('建議過的那一輪把那一句照畫出來', () => {
    // 怎麼寫那一句是 domain 的事；元件只負責畫，不拼字。
    const wrapper = mountHistory({
      runRecords: [runRecord(1, '賣出', 'danger', false,
        '做空 5 倍 · 保證金 1000 · 名目 5000 · 停損 102 · 停利 96')],
    })

    expect(wrapper.get('[data-testid="run-history-plan"]').text())
      .toBe('做空 5 倍 · 保證金 1000 · 名目 5000 · 停損 102 · 停利 96')
  })

  it('沒有建議的那一輪一個字都不加', () => {
    // 沒有建議是常態（沒填部位規劃的機器人、判出持有的那幾輪），
    // 而一排寫著「—」的欄位會讓這張表讀起來像壞掉的。
    const wrapper = mountHistory({ runRecords: [runRecord(1, '持有', 'neutral')] })

    expect(wrapper.find('[data-testid="run-history-plan"]').exists()).toBe(false)
  })
})

describe('StrategyBotRunHistory 的註腳', () => {
  it.each([
    { name: '有註腳、有紀錄時說出來', note: '一排持有也可能是行情停了', records: [runRecord(1, '持有', 'neutral')], shown: true },
    { name: '沒有註腳（現貨機器人）時不說', note: null, records: [runRecord(1, '持有', 'neutral')], shown: false },
    { name: '一輪都沒跑過時不說', note: '一排持有也可能是行情停了', records: [], shown: false },
  ])('$name', ({ note, records, shown }) => {
    const wrapper = mount(StrategyBotRunHistory, {
      props: { runRecords: records, loading: false, failureMessage: '', timeZoneIdentifier: 'Asia/Taipei', note },
    })

    expect(wrapper.find('[data-testid="run-history-note"]').exists()).toBe(shown)
    if (shown) {
      expect(wrapper.get('[data-testid="run-history-note"]').text()).toBe(note)
    }
  })
})
