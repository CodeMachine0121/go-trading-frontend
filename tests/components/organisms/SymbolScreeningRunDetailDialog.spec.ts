import { mount } from '@vue/test-utils'
import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import SymbolScreeningRunDetailDialog from '~/components/organisms/SymbolScreeningRunDetailDialog.vue'
import { SymbolScreeningContributionVo } from '~/domain/models/vo/symbol-screening-contribution-vo'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { SymbolScreeningRunDetail } from '~/domain/models/entities/symbol-screening-run-detail'
import { SymbolScreeningSnapshot } from '~/domain/models/entities/symbol-screening-snapshot'
import { SymbolScreeningTerms } from '~/domain/models/entities/symbol-screening-terms'
import { buildCandidate, buildRunDetail, buildScreeningRun } from '../../fixtures/symbol-screening'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountDialog(detail: ReturnType<typeof buildRunDetail> | null, failureMessage: LocalizedTextVo | null = null) {
  return mount(SymbolScreeningRunDetailDialog, {
    props: {
      open: true,
      detail: detail?.toDto() ?? null,
      loading: false,
      failureMessage,
      timeZone: buildTimeZone(),
    },
  })
}

describe('SymbolScreeningRunDetailDialog', () => {
  it('lists the candidates in the given order with their verdicts', () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'succeeded'), [
      buildCandidate('LINKUSDT', 'passed', { rank: 1 }),
      buildCandidate('FOOUSDT', 'rejected', { rank: 2, stage: 'basicCondition', reason: '幣安沒有這個 USDT 永續合約' }),
    ]))

    const candidates = wrapper.findAll('[data-testid="symbol-screening-candidate"]')
    expect(candidates.map(candidate => candidate.get('[data-testid="symbol-screening-candidate-symbol"]').text()))
      .toEqual(['LINKUSDT', 'FOOUSDT'])
    expect(candidates[1]?.get('[data-testid="symbol-screening-candidate-status"]').text()).toBe('淘汰')
    expect(candidates[1]?.get('[data-testid="symbol-screening-candidate-stage"]').text()).toBe('基本條件')
    expect(candidates[1]?.get('[data-testid="symbol-screening-candidate-reason"]').text()).toBe('幣安沒有這個 USDT 永續合約')
  })

  it('shows segment returns and how much shorter the longest gap gets', () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'succeeded'), [
      buildCandidate('LINKUSDT', 'passed', {
        segmentReturns: [0.2, 0.05, 0.12],
        returnWithoutBestSegment: 0.176,
        contribution: new SymbolScreeningContributionVo(0.2, 0.1, 95, 60, 35),
      }),
    ]))

    expect(wrapper.findAll('[data-testid="symbol-screening-candidate-segment-return"]').map(cell => cell.text()))
      .toEqual(['+20.0%', '+5.0%', '+12.0%'])
    expect(wrapper.get('[data-testid="symbol-screening-candidate-return-without-best"]').text()).toContain('+17.6%')
    expect(wrapper.get('[data-testid="symbol-screening-candidate-contribution"]').findAll('li').map(item => item.text()))
      .toEqual(['持倉時間比例 20.0%', '與現有組合重疊 10.0%', '現有組合最長空窗 95 天', '加上後最長空窗 60 天', '縮短 35 天'])
  })

  it('shows only the figures a candidate has', () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'succeeded'), [
      buildCandidate('XRPUSDT', 'rejected', { historyDays: 120 }),
    ]))

    expect(wrapper.get('[data-testid="symbol-screening-candidate-history-days"]').text()).toBe('歷史 120 天')
    expect(wrapper.find('[data-testid="symbol-screening-candidate-segments"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="symbol-screening-candidate-contribution"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="symbol-screening-candidate-volume"]').exists()).toBe(false)
  })

  it('shows why the portfolio could not be compared and the profile as submitted', () => {
    const wrapper = mountDialog(buildRunDetail(
      buildScreeningRun(12, 'succeeded', { contributionFailureReason: '現有組合標的 BTCUSDT 無法比較：目前沒有在交易' }),
      [buildCandidate('LINKUSDT', 'passed')], 730))

    expect(wrapper.get('[data-testid="symbol-screening-run-detail-contribution-failure"]').text())
      .toBe('現有組合標的 BTCUSDT 無法比較：目前沒有在交易')
    expect(wrapper.get('[data-testid="symbol-screening-terms-history-days"]').text()).toBe('歷史 730 天')
    expect(wrapper.get('[data-testid="symbol-screening-candidate-status"]').text()).toBe('通過')
  })

  it('offers cancel only while the run has not ended', () => {
    expect(mountDialog(buildRunDetail(buildScreeningRun(12, 'running'), []))
      .find('[data-testid="symbol-screening-run-detail-cancel"]').exists()).toBe(true)
    expect(mountDialog(buildRunDetail(buildScreeningRun(12, 'succeeded'), []))
      .find('[data-testid="symbol-screening-run-detail-cancel"]').exists()).toBe(false)
  })

  it('shows the recent average daily volume and the rank when there are some', () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'succeeded'), [
      buildCandidate('LINKUSDT', 'passed', { rank: 1, averageDailyQuoteVolume: new Decimal('35000000') }),
    ]))

    expect(wrapper.get('[data-testid="symbol-screening-candidate-volume"]').text()).toBe('最近 30 天日均成交額 35,000,000 USDT')
    expect(wrapper.text()).toContain('第 1 名')
  })

  it('shows the baseline symbols the run compared against', () => {
    const wrapper = mountDialog(new SymbolScreeningRunDetail(buildScreeningRun(12, 'succeeded'),
      new SymbolScreeningSnapshot('趨勢 V3', new SymbolScreeningTerms('1d', 'longOnly', new Decimal(1), new Decimal(0.05),
        new Decimal(0.05), 730, 3, 6, new Decimal(20000000), ['BTCUSDT', 'ETHUSDT'])), []))

    expect(wrapper.get('[data-testid="symbol-screening-terms-baseline"]').text()).toBe('現有組合 BTCUSDT, ETHUSDT')
  })

  it('shows why a failed run failed', () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'failed', { failureReason: '超過時間上限' }), []))

    expect(wrapper.text()).toContain('超過時間上限')
  })

  it('asks to close and to cancel', async () => {
    const wrapper = mountDialog(buildRunDetail(buildScreeningRun(12, 'running'), []))

    await wrapper.get('[data-testid="symbol-screening-run-detail-cancel"]').trigger('click')
    await wrapper.getComponent({ name: 'AppModal' }).vm.$emit('close')

    expect(wrapper.emitted('cancel')).toEqual([[12]])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('says why the run could not be read', () => {
    const wrapper = mountDialog(null, new LocalizedTextVo('找不到這筆篩選', ''))

    expect(wrapper.get('[data-testid="symbol-screening-run-detail-failure"]').text()).toBe('找不到這筆篩選')
  })
})
