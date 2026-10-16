import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ChartLegend from '~/components/molecules/ChartLegend.vue'
import { ChartReadoutDomain } from '~/domain/models/domains/chart-readout-domain'
import { KCandleSpec, kCandleChartOf } from '../../fixtures/k-candle-chart'
import { AppliedIndicatorLineDto, AppliedIndicatorRowDto } from '~/domain/models/dto/applied-indicator-row-dto'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'

const CHART = kCandleChartOf('1h', [
  new KCandleSpec('2026-10-16T10:00:00.000Z', '100', '112', '99', '110'),
  new KCandleSpec('2026-10-16T11:00:00.000Z', '108', '111', '104', '105'),
])
const readoutAt = (index: number | null) => new ChartReadoutDomain(CHART, index, new Date('2026-10-16T11:30:00.000Z')).toDto()

describe('圖例', () => {
  it('第一行：標題、刻度，與那一根的開高低收和相對前一根收盤的漲跌', () => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '一小時', readout: readoutAt(1) } })

    expect(wrapper.get('[data-testid="interval-label"]').text()).toBe('一小時')
    expect(wrapper.get('[data-testid="legend-values"]').text()).toBe('開108高111低104收105−5 (−4.55%)')
  })

  it('漲的那一根用正號', () => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '一小時', readout: readoutAt(0) } })

    expect(wrapper.get('[data-testid="legend-values"]').text()).toContain('+10 (+10.00%)')
  })

  it('還沒有圖時只有標題，不寫開高低收', () => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '—' } })

    expect(wrapper.find('[data-testid="legend-values"]').exists()).toBe(false)
  })

  it('第二行由使用的那一邊補（合約的三條價格）', () => {
    const wrapper = mount(ChartLegend, {
      props: { title: 'BTCUSDT.P', intervalLabel: '一小時' },
      slots: { extra: '<span data-testid="extra">標記價格 7777</span>' },
    })

    expect(wrapper.get('[data-testid="extra"]').text()).toBe('標記價格 7777')
  })
})

describe('圖例：已套用的指標', () => {
  function indicatorRow(id: number, isVisible: boolean): AppliedIndicatorRowDto {
    const strategyScript = new ChartApplicableStrategyScriptDto(7, '二十根均線', 'float', [], true, false)

    return new AppliedIndicatorRowDto(
      new AppliedIndicatorDto(id, strategyScript, [new StrategyScriptParameterDto('期數', 'lookbackCount', 20)], isVisible),
      [], false, null, null, [new AppliedIndicatorLineDto(`${id}-均價`, '均價', '--color-chart-line-1')], false, isVisible)
  }

  it('每一個已套用的指標各一行，寫名字與這一次的值', () => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '一小時', appliedIndicatorRows: [indicatorRow(1, true)] } })

    expect(wrapper.get('[data-testid="legend-indicator"]').text()).toContain('二十根均線期數 20')
  })

  it('收起來的那一行說的是「在圖上顯示」', () => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '一小時', appliedIndicatorRows: [indicatorRow(1, false)] } })

    expect(wrapper.get('[data-testid="legend-toggle-indicator-1"]').attributes('aria-label')).toBe('在圖上顯示')
  })

  it.each([
    ['legend-toggle-indicator-1', 'toggleVisibility'],
    ['legend-remove-indicator-1', 'remove'],
  ])('按 %s 交出那一個', async (button, event) => {
    const wrapper = mount(ChartLegend, { props: { title: 'BTCUSDT', intervalLabel: '一小時', appliedIndicatorRows: [indicatorRow(1, true)] } })

    await wrapper.get(`[data-testid="${button}"]`).trigger('click')

    expect(wrapper.emitted(event)).toEqual([[1]])
  })
})
