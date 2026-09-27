import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ContractTradeForm from '~/components/organisms/ContractTradeForm.vue'
import { ContractTradeJournalApplication } from '~/application/contract-trade-journal-application'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { ContractTradeJournalService } from '~/domain/service/contract-trade-journal-service'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { IContractTradeRecordProxy } from '~/domain/interface/i-contract-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { ContractTradePrefill } from '~/domain/models/entities/contract-trade-prefill'
import { ContractTradeRejectedError } from '~/domain/errors/contract-trade-rejected-error'
import { ContractTradeOpenPositionExistsError } from '~/domain/errors/contract-trade-open-position-exists-error'
import { ContractTradeFormFieldVo } from '~/domain/models/vo/contract-trade-form-field-vo'
import { buildRecord, contractTradeRecordProxyMock, kCandleContractProxyMock, tradingStrategyProxyMock } from '../../fixtures/contract-trade-journal'

const recordProxy = contractTradeRecordProxyMock()
const tradingStrategyProxy = tradingStrategyProxyMock()
const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }
const STUBS = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

function prefill(mode: 'newTrade' | 'addEntryFill' = 'newTrade'): ContractTradePrefill {
  return new ContractTradePrefill(
    'link-412', mode, mode === 'addEntryFill' ? 27 : null, 'BTC 趨勢跟隨', 412, new Date('2026-09-25T06:00:00Z'),
    'BTCUSDT', 'long', new Decimal(10), new Decimal(96380), new Decimal(100785), 5, 'BTC 趨勢跟隨',
    new Decimal(97850), new Decimal('0.051'))
}

function mountForm(props: Record<string, unknown> = {}) {
  return mount(ContractTradeForm, {
    props: {
      timeZoneIdentifier: 'UTC',
      contractTradeJournalApplication: new ContractTradeJournalApplication(new ContractTradeJournalService(
        recordProxy as unknown as IContractTradeRecordProxy,
        tradingStrategyProxy as unknown as ITradingStrategyProxy,
        kCandleContractProxyMock() as unknown as IKCandleContractProxy)),
      tradeJournalSettingApplication: new TradeJournalSettingApplication(new TradeJournalSettingService(
        settingProxy as unknown as ITradeJournalSettingProxy, tagProxy as unknown as ITradeTagProxy)),
      tradingStrategyApplication: new TradingStrategyApplication(
        new TradingStrategyService(tradingStrategyProxy as unknown as ITradingStrategyProxy)),
      ...props,
    },
    global: { stubs: STUBS },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(null, null))
  tagProxy.listTags.mockResolvedValue([new TradeTag(1, 'setup', '突破')])
  tradingStrategyProxy.listTradingStrategies.mockResolvedValue([])
})

describe('ContractTradeForm：記一筆', () => {
  it('輸入成交即時顯示持倉與均價；尚未設定費率時提示並附前往設定', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="fill-price"]').setValue('97905')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('0.030')

    expect(wrapper.get('[data-testid="preview-position"]').text()).toBe('0.03')
    expect(wrapper.get('[data-testid="preview-average-entry"]').text()).toBe('97,905')
    expect(wrapper.get('[data-testid="fee-rate-missing"]').text()).toContain('尚未設定手續費率')
    expect(wrapper.get('[data-testid="fee-rate-missing"] a').attributes('href')).toBe('/settings#settings-trade-journal')
  })

  it('改過內容就告訴上層', async () => {
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')

    expect(wrapper.emitted('dirtyChange')?.at(-1)).toEqual([true])
  })

  it('儲存成功交出那一筆', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    const wrapper = mountForm()
    await flushPromises()
    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="fill-price"]').setValue('97905')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('0.030')
    await wrapper.get('[data-testid="trade-leverage"]').setValue('10')
    await wrapper.get('[data-testid="trade-confidence"]').setValue('3')
    await wrapper.get('[data-testid="trade-confidence"]').setValue('')
    await wrapper.get('[data-testid="trade-entry-reason"]').setValue('突破')
    await wrapper.get('[data-testid="trade-planned-take-profit"]').setValue('100785')
    await wrapper.get('[data-testid="trade-direction"]').setValue('short')

    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: 27 })
  })

  it('止損放錯邊時原話寫在計畫止損旁', async () => {
    recordProxy.recordTrade.mockRejectedValue(new ContractTradeRejectedError('做多的止損必須低於進場價', new ContractTradeFormFieldVo('plannedStopLossPrice')))
    const wrapper = mountForm()
    await flushPromises()
    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="fill-price"]').setValue('97905')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('0.03')
    await wrapper.get('[data-testid="trade-planned-stop-loss"]').setValue('98000')

    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('做多的止損必須低於進場價')
    expect(wrapper.find('[data-testid="form-rejection"]').exists()).toBe(false)
    expect(wrapper.emitted('saved')).toBeUndefined()
  })

  it('同標的同方向已有持倉中時表單上方寫原話並提供前往那一筆加成交', async () => {
    recordProxy.recordTrade.mockRejectedValue(new ContractTradeOpenPositionExistsError('BTCUSDT 做多已有持倉中的 #27，請在那一筆加成交', 27))
    const wrapper = mountForm()
    await flushPromises()
    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="fill-price"]').setValue('1')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1')

    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="form-rejection"]').text()).toContain('#27')
    expect(wrapper.get('[data-testid="form-rejection-go"]').attributes('href')).toBe('/contract-trade-journal/27')
    expect(wrapper.get('[data-testid="form-rejection-go"]').text()).toContain('加成交')
  })

  it('就地新增型態標籤、貼既有標籤、挑關聯交易策略後一起送出', async () => {
    tagProxy.createTag.mockResolvedValue(new TradeTag(6, 'setup', '回踩'))
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    const { TradingStrategy } = await import('~/domain/models/entities/trading-strategy')
    tradingStrategyProxy.listTradingStrategies.mockResolvedValue([
      new TradingStrategy(5, 'BTC 趨勢跟隨', [], null, null, 'contractKCandle', 'longShort'),
      new TradingStrategy(7, 'ETH 均線', [], null, null, 'kCandle'),
    ])
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="tag-picker-input"]').setValue('回踩')
    await wrapper.get('[data-testid="tag-picker-create"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="tag-option-1"]').trigger('click')
    expect(wrapper.get('[data-testid="trade-trading-strategy"]').findAll('option').map(option => option.text()))
      .toEqual(['不關聯（自行判斷）', 'BTC 趨勢跟隨'])
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('5')
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('')
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('5')
    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="fill-price"]').setValue('1')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1')
    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(recordProxy.recordTrade.mock.calls[0]?.[0]).toMatchObject({ tradingStrategyId: 5, setupTagIds: [6, 1] })
  })

  it('後面的成交沒存成功時提供前往已建立的那一筆', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new ContractTradeRejectedError('請求有誤', null))
    const wrapper = mountForm()
    await flushPromises()
    await wrapper.get('[data-testid="trade-symbol"]').setValue('BTCUSDT')
    await wrapper.get('[data-testid="fill-price"]').setValue('1')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1')
    await wrapper.get('[data-testid="fill-add-entry"]').trigger('click')
    await wrapper.findAll('[data-testid="fill-price"]')[1]!.setValue('2')
    await wrapper.findAll('[data-testid="fill-quantity"]')[1]!.setValue('1')
    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="form-rejection"]').text()).toContain('已建立 #27')
    expect(wrapper.get('[data-testid="form-rejection-go"]').text()).toBe('前往 #27')
  })
})

describe('ContractTradeForm：從連結打開', () => {
  it('預填那一輪，上方說明來源，進場價與數量標示請改成實際成交', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    const wrapper = mountForm({ journalLinkIdentifier: 'link-412' })
    await flushPromises()

    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('來自 BTC 趨勢跟隨・第 412 輪・2026-09-25 06:00 送出')
    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('參考價 97,850')
    expect(wrapper.get('[data-testid="fill-price-confirm"]').text()).toBe('請改成實際成交')
    expect((wrapper.get('[data-testid="trade-symbol"]').element as HTMLInputElement).value).toBe('BTCUSDT')
    expect(wrapper.text()).toContain('預填')
    expect(wrapper.emitted('redirect')).toBeUndefined()
  })

  it('已有持倉中時交給上層轉去那一筆的加成交', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill('addEntryFill'))
    const wrapper = mountForm({ journalLinkIdentifier: 'link-412' })
    await flushPromises()

    expect(wrapper.emitted('redirect')).toEqual([['/contract-trade-journal/27?addFill=entry&journalLink=link-412']])
  })

  it('讀取預填中不能儲存', async () => {
    recordProxy.findJournalLink.mockReturnValue(new Promise(() => {}))
    const wrapper = mountForm({ journalLinkIdentifier: 'link-412' })
    await flushPromises()

    expect(wrapper.find('[data-testid="prefill-loading"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="trade-save"]').attributes('disabled')).toBeDefined()
  })
})

describe('ContractTradeForm：對既有交易加成交', () => {
  it('不再問合約標的與計畫，連結帶的是加一筆進場', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill('addEntryFill'))
    recordProxy.addFill.mockResolvedValue(buildRecord({ status: 'open' }))
    const wrapper = mountForm({ existingRecord: buildRecord({ status: 'open' }).toDomain().toDto(), journalLinkIdentifier: 'link-412' })
    await flushPromises()

    expect(wrapper.find('[data-testid="trade-symbol"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="trade-planned-stop-loss"]').exists()).toBe(false)
    expect(wrapper.emitted('redirect')).toBeUndefined()

    await wrapper.get('[data-testid="contract-trade-form"]').trigger('submit')
    await flushPromises()

    expect(recordProxy.addFill).toHaveBeenCalledWith(27, expect.objectContaining({ kind: 'entry' }))
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('讀不到參考資料時提醒', async () => {
    settingProxy.findSetting.mockRejectedValue(new Error('weird'))
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.get('[data-testid="reference-failure"]').text()).toBe('與交易日誌往來時發生未預期的錯誤。')
  })
})
