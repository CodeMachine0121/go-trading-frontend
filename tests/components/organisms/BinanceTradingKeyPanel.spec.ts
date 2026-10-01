import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BinanceTradingKeyPanel from '~/components/organisms/BinanceTradingKeyPanel.vue'
import { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'

const STORED = new BinanceTradingKeyDto(true, '結尾 a1b2', '現貨', new Date('2026-10-01T08:00:00Z'))
const UNCONFIGURED = new BinanceTradingKeyDto(false, null, '', null)

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(BinanceTradingKeyPanel, {
    props: {
      apiKey: '',
      secretKey: '',
      formVisible: true,
      timeZoneIdentifier: 'Asia/Taipei',
      ...props,
    },
  })
}

function mountStored(props: Record<string, unknown> = {}) {
  return mountPanel({ setting: STORED, formVisible: false, ...props })
}

describe('BinanceTradingKeyPanel：目前的狀態', () => {
  it('讀不到設定時不顯示「還沒有設定」', () => {
    const wrapper = mountPanel({ loadErrorMessage: '連不上後端 go-trading API' })

    expect(wrapper.get('[data-testid="binance-trading-key-load-error"]').text()).toContain('連不上後端')
    expect(wrapper.find('[data-testid="binance-trading-key-unconfigured"]').exists()).toBe(false)
  })

  it('還沒讀到任何設定時當作未設定的起點', () => {
    const wrapper = mountPanel()

    expect(wrapper.find('[data-testid="binance-trading-key-configured"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="binance-api-key-input"]').exists()).toBe(true)
  })

  it('未設定時明說並攤開兩格，Secret Key 以遮蔽方式輸入', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    expect(wrapper.get('[data-testid="binance-trading-key-unconfigured"]').text()).toContain('還沒有設定')
    expect(wrapper.get('[data-testid="binance-secret-key-input"]').attributes('type')).toBe('password')
  })

  it('已設定時顯示結尾、可交易市場與設定時刻，沒有任何輸入格', () => {
    const wrapper = mountStored()

    expect(wrapper.get('[data-testid="binance-trading-key-api-key"]').text()).toBe('結尾 a1b2')
    expect(wrapper.get('[data-testid="binance-trading-key-tradable-markets"]').text()).toBe('現貨')
    expect(wrapper.get('[data-testid="binance-trading-key-configured-at"]').text()).toContain('2026')
    expect(wrapper.find('[data-testid="binance-secret-key-input"]').exists()).toBe(false)
  })

  it('說明可交易市場只記存入當下的狀態', () => {
    expect(mountStored().text()).toContain('可交易市場只記存入當下的狀態')
  })
})

describe('BinanceTradingKeyPanel：存入', () => {
  it('兩格空白也按得下去，讓畫面指出是哪一格', async () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    await wrapper.get('[data-testid="binance-trading-key-save"]').trigger('click')

    expect(wrapper.emitted('save')).toHaveLength(1)
  })

  it('兩格填的字交回上層', async () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED })

    await wrapper.get('[data-testid="binance-api-key-input"]').setValue('the-api-key')
    await wrapper.get('[data-testid="binance-secret-key-input"]').setValue('the-secret-key')

    expect(wrapper.emitted('update:apiKey')?.at(-1)).toEqual(['the-api-key'])
    expect(wrapper.emitted('update:secretKey')?.at(-1)).toEqual(['the-secret-key'])
  })

  it('存不成的原因照原話顯示在兩格底下', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED, saveErrorMessage: '連不上幣安，請稍後再試' })

    expect(wrapper.get('[data-testid="binance-trading-key-save-error"]').text()).toBe('連不上幣安，請稍後再試')
  })

  it('欄位錯誤掛在那一格底下', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED, secretKeyError: '必須給 Secret Key' })

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('必須給 Secret Key')
  })

  it('等幣安確認期間說正在確認，存入鍵與兩格都按不動', () => {
    const wrapper = mountPanel({ setting: UNCONFIGURED, saving: true })

    expect(wrapper.get('[data-testid="binance-trading-key-verifying"]').text()).toContain('正在向幣安確認')
    expect(wrapper.get('[data-testid="binance-trading-key-save"]').text()).toBe('向幣安確認中…')
    expect(wrapper.get('[data-testid="binance-trading-key-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-testid="binance-api-key-input"]').attributes('disabled')).toBeDefined()
  })

  it('換一組時可以取消', async () => {
    const wrapper = mountStored({ formVisible: true, editing: true })

    await wrapper.get('[data-testid="binance-trading-key-cancel"]').trigger('click')

    expect(wrapper.emitted('cancelEditing')).toHaveLength(1)
  })

  it('按「換一組」交給上層攤開兩格', async () => {
    const wrapper = mountStored()

    await wrapper.get('[data-testid="binance-trading-key-edit"]').trigger('click')

    expect(wrapper.emitted('startEditing')).toHaveLength(1)
  })
})

describe('BinanceTradingKeyPanel：移除', () => {
  it('先確認，並說明開著自動下單的機器人會一併被關掉', async () => {
    const wrapper = mountStored()

    await wrapper.get('[data-testid="binance-trading-key-remove"]').trigger('click')

    expect(wrapper.emitted('remove')).toBeUndefined()
    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).props('message'))
      .toContain('所有開著自動下單的機器人會一併被關掉')

    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    expect(wrapper.emitted('remove')).toHaveLength(1)
  })

  it('取消確認就什麼都不變', async () => {
    const wrapper = mountStored()

    await wrapper.get('[data-testid="binance-trading-key-remove"]').trigger('click')
    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('cancel')

    expect(wrapper.emitted('remove')).toBeUndefined()
  })

  it('移除失敗時在已存那一組旁邊說原因', () => {
    const wrapper = mountStored({ saveErrorMessage: '移除失敗' })

    expect(wrapper.get('[data-testid="binance-trading-key-save-error"]').text()).toBe('移除失敗')
  })
})
