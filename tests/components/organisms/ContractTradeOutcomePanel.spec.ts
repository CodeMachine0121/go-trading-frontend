import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ContractTradeOutcomePanel from '~/components/organisms/ContractTradeOutcomePanel.vue'
import { TradePricePathDto } from '~/domain/models/dto/trade-price-path-dto'
import { buildRecord, closedOutcome, unavailable } from '../../fixtures/contract-trade-journal'
import { buildTimeZone } from '../../fixtures/time-zone'

const TIME_ZONE = buildTimeZone('UTC')
const STUBS = { TradePricePathChart: { template: '<div data-testid="price-path-chart-stub" />' } }

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(ContractTradeOutcomePanel, {
    props: { record: buildRecord().toDomain().toDto(), timeZone: TIME_ZONE, ...props },
    global: { stubs: STUBS },
  })
}

describe('ContractTradeOutcomePanel', () => {
  it('結果逐項呈現，來自連結的交易列出當時的建議', () => {
    const wrapper = mountPanel({ pricePath: new TradePricePathDto([], [], [], null) })

    expect(wrapper.text()).toContain('+120.53')
    expect(wrapper.get('[data-testid="trade-source"]').text()).toContain('參考價 97,850')
    expect(wrapper.find('[data-testid="price-path-chart-stub"]').exists()).toBe(true)
  })

  it('沒有行情時圖的位置寫同一句話，不畫空圖', () => {
    const record = buildRecord({ outcome: closedOutcome({ maximumAdverseExcursion: unavailable('noMarketData') }) }).toDomain().toDto()
    const wrapper = mountPanel({ record })

    expect(wrapper.get('[data-testid="price-path-message"]').text()).toBe('沒有行情資料，無法計算')
    expect(wrapper.find('[data-testid="price-path-chart-stub"]').exists()).toBe(false)
  })

  it('行情讀取中；讀不到時說原因；讀回來是空的也說', () => {
    expect(mountPanel({ pricePathLoading: true }).find('[data-testid="price-path-loading"]').exists()).toBe(true)
    expect(mountPanel({ pricePathFailureMessage: '連不上' }).get('[data-testid="price-path-message"]').text()).toBe('連不上')
    expect(mountPanel({ pricePath: new TradePricePathDto([], [], [], '沒有行情資料，無法計算') }).get('[data-testid="price-path-message"]').text())
      .toBe('沒有行情資料，無法計算')
  })

  it('不是來自連結就沒有建議那一段', () => {
    expect(mountPanel({ record: buildRecord({ source: null }).toDomain().toDto() }).find('[data-testid="trade-source"]').exists()).toBe(false)
  })
})
