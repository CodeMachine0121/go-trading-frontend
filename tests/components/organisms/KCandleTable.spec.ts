import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import KCandleTable from '~/components/organisms/KCandleTable.vue'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import { buildTimeZone } from '../../fixtures/time-zone'

function buildKCandleDto(openTime: string, trend: KCandleTrendVo): KCandleDto {
  return new KCandleDto(
    'BTCUSDT',
    new Date(openTime),
    new Decimal('100'),
    new Decimal('120'),
    new Decimal('90'),
    new Decimal('110'),
    new Decimal('11'),
    new Decimal('1200'),
    new Decimal('5'),
    new Decimal('600'),
    trend,
  )
}

const UP_TREND = new KCandleTrendVo('up', '上漲', 'success')
const DOWN_TREND = new KCandleTrendVo('down', '下跌', 'danger')

describe('KCandleTable', () => {
  it.each([
    { candleCount: 1, expectedCountText: '共 1 根' },
    { candleCount: 3, expectedCountText: '共 3 根' },
  ])('$candleCount 根時逐根列出並顯示筆數', ({ candleCount, expectedCountText }) => {
    const kCandleDtos = Array.from({ length: candleCount }, (_unused, index) =>
      buildKCandleDto(`2026-08-30T10:0${index}:00.000Z`, UP_TREND))

    const wrapper = mount(KCandleTable, {
      props: { result: new KCandleSearchResultDto(kCandleDtos), timeZone: buildTimeZone() },
    })

    expect(wrapper.findAll('[data-testid="k-candle-row"]')).toHaveLength(candleCount)
    expect(wrapper.get('[data-testid="result-count"]').text()).toBe(expectedCountText)
    expect(wrapper.find('[data-testid="empty-result"]').exists()).toBe(false)
  })

  it('還沒查過時就說還沒查，不是查無——那是兩種不同的答案', () => {
    const wrapper = mount(KCandleTable, { props: { result: null, timeZone: buildTimeZone() } })

    expect(wrapper.get('[data-testid="idle-result"]').text()).toContain('按「查詢」')
    expect(wrapper.find('[data-testid="empty-result"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="result-count"]').exists()).toBe(false)
  })

  it('一根都沒有時顯示查無 K 線而不是空白表格', () => {
    const wrapper = mount(KCandleTable, {
      props: { result: new KCandleSearchResultDto([]), timeZone: buildTimeZone() },
    })

    expect(wrapper.get('[data-testid="empty-result"]').text()).toContain('查無 K 線')
    expect(wrapper.findAll('[data-testid="k-candle-row"]')).toHaveLength(0)
    expect(wrapper.get('[data-testid="result-count"]').text()).toBe('共 0 根')
  })

  it('每根的漲跌以 domain 算好的標籤呈現', () => {
    const wrapper = mount(KCandleTable, {
      props: {
        result: new KCandleSearchResultDto([
          buildKCandleDto('2026-08-30T10:00:00.000Z', UP_TREND),
          buildKCandleDto('2026-08-30T10:05:00.000Z', DOWN_TREND),
        ]),
        timeZone: buildTimeZone(),
      },
    })

    const rows = wrapper.findAll('[data-testid="k-candle-row"]')
    expect(rows[0]?.text()).toContain('上漲')
    expect(rows[1]?.text()).toContain('下跌')
  })

  it.each([
    { identifier: 'UTC', expectedOpenTime: '2026-08-30 10:05', expectedCityLabel: '世界標準時間' },
    { identifier: 'Asia/Taipei', expectedOpenTime: '2026-08-30 18:05', expectedCityLabel: '台北' },
  ])('選定 $identifier 時，起始時間以該時區呈現', ({ identifier, expectedOpenTime, expectedCityLabel }) => {
    const wrapper = mount(KCandleTable, {
      props: {
        result: new KCandleSearchResultDto([
          buildKCandleDto('2026-08-30T10:05:00.000Z', UP_TREND),
        ]),
        timeZone: buildTimeZone(identifier),
      },
    })

    expect(wrapper.get('[data-testid="k-candle-row"]').text()).toContain(expectedOpenTime)
    expect(wrapper.text()).toContain(`起始時間（${expectedCityLabel}）`)
  })

  it('沒有給操作插槽時不多出操作欄', () => {
    const wrapper = mount(KCandleTable, {
      props: {
        result: new KCandleSearchResultDto([buildKCandleDto('2026-08-30T10:00:00.000Z', UP_TREND)]),
        timeZone: buildTimeZone(),
      },
    })

    expect(wrapper.text()).not.toContain('操作')
  })

  it('給了操作插槽時，每一列都拿得到那一根的資料', () => {
    const wrapper = mount(KCandleTable, {
      props: {
        result: new KCandleSearchResultDto([
          buildKCandleDto('2026-08-30T10:00:00.000Z', UP_TREND),
          buildKCandleDto('2026-08-30T10:05:00.000Z', DOWN_TREND),
        ]),
        timeZone: buildTimeZone(),
      },
      slots: {
        'row-actions': '<button data-testid="row-action">{{ params.kCandle.trend.label }}</button>',
      },
    })

    const rowActions = wrapper.findAll('[data-testid="row-action"]')
    expect(rowActions).toHaveLength(2)
    expect(rowActions[0]?.text()).toBe('上漲')
    expect(rowActions[1]?.text()).toBe('下跌')
  })
})
