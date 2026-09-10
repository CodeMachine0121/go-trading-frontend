import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import { KCandleChartRangePresetDto } from '~/domain/models/dto/k-candle-chart-range-preset-dto'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'

// 選單上有哪幾項是領域的判斷，所以測試也從領域拿——在這裡另抄一份，
// 測的就變成「我抄對了嗎」，而不是「畫面照領域說的畫了嗎」。
const AGGREGATION_INTERVAL_CHOICES = new KCandleChartApplication(
  new KCandleChartService({} as IKCandleProxy)).listAggregationIntervalChoices()

const AUTOMATIC = choiceLabelled('自動')

function choiceLabelled(label: string): AggregationIntervalChoiceDto {
  const choice = AGGREGATION_INTERVAL_CHOICES.find(candidate => candidate.label === label)
  if (choice === undefined) {
    throw new Error(`選單上沒有「${label}」這一項`)
  }

  return choice
}

function mountToolbar(
  { activeChoice = AUTOMATIC, loading = false }:
  { activeChoice?: AggregationIntervalChoiceDto, loading?: boolean } = {},
) {
  return mount(KCandleChartToolbar, {
    props: {
      tradingSymbolApplication: buildTradingSymbolApplication(),
      symbol: 'BTCUSDT',
      presets: [new KCandleChartRangePresetDto('一天', 24 * 60 * 60 * 1000)],
      aggregationIntervalChoices: AGGREGATION_INTERVAL_CHOICES,
      activeAggregationIntervalChoice: activeChoice,
      drawing: 'candlestick' as const,
      loading,
    },
  })
}

function intervalSelect(wrapper: ReturnType<typeof mountToolbar>) {
  return wrapper.find('[data-testid="aggregation-interval-choice-select"]')
}

describe('圖表上挑一根 K 線涵蓋多久', () => {
  it('列出五種可挑的粗細，由細到粗，第一項是自動', () => {
    const wrapper = mountToolbar()

    expect(intervalSelect(wrapper).findAll('option').map(option => option.text()))
      .toEqual(['自動', '一分鐘', '五分鐘', '十五分鐘', '一小時'])
  })

  it('選單上選著的就是目前那一個', () => {
    const wrapper = mountToolbar({ activeChoice: choiceLabelled('十五分鐘') })

    expect((intervalSelect(wrapper).element as HTMLSelectElement).value).toBe('15m')
  })

  it('沒挑時選著「自動」', () => {
    const wrapper = mountToolbar()

    expect((intervalSelect(wrapper).element as HTMLSelectElement).value).toBe('auto')
  })

  it('挑一種就把那個選擇交出去，不是交出一個字串', async () => {
    const wrapper = mountToolbar()

    await intervalSelect(wrapper).setValue('5m')

    // 交出去的是那份清單裡的那一項本身，上一層才不必自己把字串換回選擇。
    const emitted = wrapper.emitted('selectAggregationIntervalChoice')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0]).toStrictEqual(choiceLabelled('五分鐘'))
  })

  it('挑回「自動」時交出去的是「沒挑」，不是最細的那一種', async () => {
    const wrapper = mountToolbar({ activeChoice: choiceLabelled('一小時') })

    await intervalSelect(wrapper).setValue('auto')

    const emitted = wrapper.emitted('selectAggregationIntervalChoice')
    expect((emitted?.[0]?.[0] as AggregationIntervalChoiceDto).declaredInterval).toBeNull()
  })

  it('正在取行情時挑不動——與「看多長」同時停用', () => {
    const wrapper = mountToolbar({ loading: true })

    expect((intervalSelect(wrapper).element as HTMLSelectElement).disabled).toBe(true)
  })

  it('清單裡沒有的值不當成一次選擇——那是清單壞了，不是使用者挑的', async () => {
    const wrapper = mountToolbar()

    await intervalSelect(wrapper).setValue('4h')

    expect(wrapper.emitted('selectAggregationIntervalChoice')).toBeUndefined()
  })
})
