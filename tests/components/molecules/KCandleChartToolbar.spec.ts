import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import KCandleChartToolbar from '~/components/molecules/KCandleChartToolbar.vue'
import type { AggregationIntervalChoiceDto } from '~/domain/models/dto/aggregation-interval-choice-dto'
import {
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE, aggregationIntervalChoiceOf,
} from '../../fixtures/aggregation-interval-choice'

// 這是個分子，它只負責「照給它的那份清單畫，並把使用者點到的那一項交回去」。
// **清單上該有哪幾項是領域的判斷，不由它決定**，所以這裡給的是一份測試自己的清單——
// 換成真的那一份，這裡就會連帶測到領域，而那件事由圖表面板那組測試負責。
const AGGREGATION_INTERVAL_CHOICES: AggregationIntervalChoiceDto[] = [
  AUTOMATIC_AGGREGATION_INTERVAL_CHOICE,
  aggregationIntervalChoiceOf('1m'),
  aggregationIntervalChoiceOf('5m'),
  aggregationIntervalChoiceOf('15m'),
  aggregationIntervalChoiceOf('1h'),
]

const AUTOMATIC = AUTOMATIC_AGGREGATION_INTERVAL_CHOICE

function choiceLabelled(label: string): AggregationIntervalChoiceDto {
  const choice = AGGREGATION_INTERVAL_CHOICES.find(candidate => candidate.label.traditionalChinese === label)
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
      aggregationIntervalChoices: AGGREGATION_INTERVAL_CHOICES,
      activeAggregationIntervalChoice: activeChoice,
      drawing: 'candlestick' as const,
      loading,
    },
  })
}

function intervalButtons(wrapper: ReturnType<typeof mountToolbar>) {
  return wrapper.findAll('[data-testid="aggregation-interval-choice-button"]')
}

function pressedInterval(wrapper: ReturnType<typeof mountToolbar>) {
  return intervalButtons(wrapper).find(button => button.attributes('aria-pressed') === 'true')?.attributes('data-interval')
}

describe('圖表上挑一根 K 線涵蓋多久', () => {
  it('照給它的那份清單排出每一顆，細邊上寫短說法、滑過去看得到全名', () => {
    const wrapper = mountToolbar()

    expect(intervalButtons(wrapper).map(button => button.text())).toEqual(['自動', '1分', '5分', '15分', '1時'])
    expect(intervalButtons(wrapper).map(button => button.attributes('title')))
      .toEqual(['自動', '一分鐘', '五分鐘', '十五分鐘', '一小時'])
  })

  it('選著的就是目前那一個', () => {
    expect(pressedInterval(mountToolbar({ activeChoice: choiceLabelled('十五分鐘') }))).toBe('15m')
  })

  it('沒挑時選著「自動」', () => {
    expect(pressedInterval(mountToolbar())).toBe('auto')
  })

  it('挑一種就把那個選擇交出去，不是交出一個字串', async () => {
    const wrapper = mountToolbar()

    await wrapper.get('[data-interval="5m"]').trigger('click')

    // 交出去的是那份清單裡的那一項本身，上一層才不必自己把字串換回選擇。
    const emitted = wrapper.emitted('selectAggregationIntervalChoice')
    expect(emitted).toHaveLength(1)
    expect(emitted?.[0]?.[0]).toStrictEqual(choiceLabelled('五分鐘'))
  })

  it('挑回「自動」時交出去的是「沒挑」，不是最細的那一種', async () => {
    const wrapper = mountToolbar({ activeChoice: choiceLabelled('一小時') })

    await wrapper.get('[data-interval="auto"]').trigger('click')

    const emitted = wrapper.emitted('selectAggregationIntervalChoice')
    expect((emitted?.[0]?.[0] as AggregationIntervalChoiceDto).declaredInterval).toBeNull()
  })

  it('正在取行情時挑不動', () => {
    const wrapper = mountToolbar({ loading: true })

    expect(intervalButtons(wrapper).every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })
})

describe('圖表上換畫法', () => {
  it('畫法收成一顆，按下去才展開四種', async () => {
    const wrapper = mountToolbar()
    expect(wrapper.findAll('[data-testid="drawing-button"]')).toHaveLength(0)

    await wrapper.get('[data-testid="drawing-menu-button"]').trigger('click')

    expect(wrapper.findAll('[data-testid="drawing-button"]').map(button => button.text()))
      .toEqual(['蠟燭', '美國線', '曲線', '面積'])
  })

  it('挑一種就交出去，選單收起來', async () => {
    const wrapper = mountToolbar()
    await wrapper.get('[data-testid="drawing-menu-button"]').trigger('click')

    await wrapper.findAll('[data-testid="drawing-button"]')[3]?.trigger('click')

    expect(wrapper.emitted('update:drawing')).toEqual([['area']])
    expect(wrapper.findAll('[data-testid="drawing-button"]')).toHaveLength(0)
  })
})

describe('圖表工具列換顯示語言', () => {
  it('每一顆的短說法與全名都改用英文說，送出去的代號不變', async () => {
    const wrapper = mountToolbar()

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(intervalButtons(wrapper).map(button => button.text())).toEqual(['Auto', '1m', '5m', '15m', '1h'])
    expect(intervalButtons(wrapper).map(button => button.attributes('title')))
      .toEqual(['Auto', '1 minute', '5 minutes', '15 minutes', '1 hour'])
    expect(intervalButtons(wrapper).map(button => button.attributes('data-interval')))
      .toEqual(['auto', '1m', '5m', '15m', '1h'])
  })
})
