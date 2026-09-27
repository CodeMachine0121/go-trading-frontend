import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SpotTradeForm from '~/components/organisms/SpotTradeForm.vue'
import { SpotTradeJournalApplication } from '~/application/spot-trade-journal-application'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { SpotTradeJournalService } from '~/domain/service/spot-trade-journal-service'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
import type { ISpotTradeRecordProxy } from '~/domain/interface/i-spot-trade-record-proxy'
import type { ITradingStrategyProxy } from '~/domain/interface/i-trading-strategy-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { SpotTradePrefill } from '~/domain/models/entities/spot-trade-prefill'
import type { SpotTradePrefillMode } from '~/domain/models/vo/spot-trade-prefill-mode-vo'
import { TradeAlreadyOpenError } from '~/domain/errors/trade-already-open-error'
import { TradeRejectedError } from '~/domain/errors/trade-rejected-error'
import { TradeFormFieldVo } from '~/domain/models/vo/trade-form-field-vo'
import { JournalLinkNotFoundError } from '~/domain/errors/journal-link-not-found-error'
import { tradingStrategyProxyMock } from '../../fixtures/contract-trade-journal'
import { buildSpotRecord, kCandleProxyMock, spotTradeRecordProxyMock } from '../../fixtures/spot-trade-journal'

const recordProxy = spotTradeRecordProxyMock()
const tradingStrategyProxy = tradingStrategyProxyMock()
const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }
const STUBS = { NuxtLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } }

function prefill(mode: SpotTradePrefillMode = 'newTrade', signal: 'buy' | 'sell' = 'buy'): SpotTradePrefill {
  return new SpotTradePrefill(
    'link-88', mode, mode === 'addBuyFill' || mode === 'addSellFill' ? 5 : null, '台積電趨勢', 88,
    new Date('2026-09-27T01:30:00Z'), signal, '2330', 'taiwanStock', new Decimal(1050),
    new Decimal(mode === 'addSellFill' ? 600 : 100), new Decimal(1000), new Decimal(1150), 7)
}

function mountForm(props: Record<string, unknown> = {}) {
  return mount(SpotTradeForm, {
    props: {
      timeZoneIdentifier: 'UTC',
      spotTradeJournalApplication: new SpotTradeJournalApplication(new SpotTradeJournalService(
        recordProxy as unknown as ISpotTradeRecordProxy,
        tradingStrategyProxy as unknown as ITradingStrategyProxy,
        kCandleProxyMock() as unknown as IKCandleProxy)),
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
  tagProxy.listTags.mockResolvedValue([new TradeTag(1, 'setup', '突破')])
  tradingStrategyProxy.listTradingStrategies.mockResolvedValue([])
})

describe('SpotTradeForm：記一筆', () => {
  it('沒有方向與槓桿；手續費自己填並提示證交稅', async () => {
    const wrapper = mountForm()
    await flushPromises()

    expect(wrapper.find('[data-testid="trade-direction"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="trade-leverage"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('台股賣出的證交稅請併入手續費')
    expect(wrapper.get('[data-testid="trade-save"]').text()).toBe('儲存（持有中）')
  })

  it('填好買進即時顯示持有與買進均價，儲存後交給上層', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')
    await wrapper.get('[data-testid="fill-price"]').setValue('1050')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1000')

    expect(wrapper.get('[data-testid="preview-holding"]').text()).toBe('1000')
    expect(wrapper.get('[data-testid="preview-average-buy"]').text()).toBe('1,050')

    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(recordProxy.recordTrade.mock.calls[0]?.[0]).toMatchObject({ symbol: '2330' })
    expect(wrapper.emitted('saved')?.[0]?.[0]).toMatchObject({ id: 5 })
  })

  it('已有持有中時上方寫原話，並提供前往那一筆加一筆買進', async () => {
    recordProxy.recordTrade.mockRejectedValue(new TradeAlreadyOpenError('2330 已有持有中的 #5', 5))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')
    await wrapper.get('[data-testid="fill-price"]').setValue('1050')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1000')
    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="form-rejection"]').text()).toContain('2330 已有持有中的 #5')
    expect(wrapper.get('[data-testid="form-rejection-go"]').attributes('href')).toBe('/spot-trade-journal/5?addFill=buy')
    expect(wrapper.get('[data-testid="form-rejection-go"]').text()).toContain('加一筆買進')
  })

  it('第一筆存好但後面的沒存成功：說已建立哪一筆並提供前往', async () => {
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    recordProxy.addFill.mockRejectedValue(new TradeRejectedError('賣出超過持有 1000', null))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')
    await wrapper.get('[data-testid="fill-price"]').setValue('1050')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1000')
    await wrapper.get('[data-testid="fill-add-sell"]').trigger('click')
    const [, sellPrice] = wrapper.findAll('[data-testid="fill-price"]')
    const [, sellQuantity] = wrapper.findAll('[data-testid="fill-quantity"]')
    await sellPrice?.setValue('1100')
    await sellQuantity?.setValue('1500')
    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="form-rejection"]').text()).toContain('已建立 #5')
    expect(wrapper.get('[data-testid="form-rejection-go"]').attributes('href')).toBe('/spot-trade-journal/5')
    expect(wrapper.get('[data-testid="form-rejection-go"]').text()).toBe('前往 #5')
  })

  it('台股數量不是整數時交易服務的拒絕寫在數量旁', async () => {
    recordProxy.recordTrade.mockRejectedValue(new TradeRejectedError('台股數量以股計，必須是整數', new TradeFormFieldVo('fillQuantity')))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')
    await wrapper.get('[data-testid="fill-price"]').setValue('1050')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1000.5')
    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="fill-error"]').text()).toBe('台股數量以股計，必須是整數')
    expect(wrapper.find('[data-testid="form-rejection"]').exists()).toBe(false)
  })
})

describe('SpotTradeForm：計畫與關聯', () => {
  it('填計畫、挑策略、寫理由、就地新增型態標籤，一起送出', async () => {
    const { TradingStrategy } = await import('~/domain/models/entities/trading-strategy')
    tradingStrategyProxy.listTradingStrategies.mockResolvedValue([
      new TradingStrategy(5, 'BTC 趨勢跟隨', [], null, null, 'contractKCandle', 'longShort'),
      new TradingStrategy(7, '台股均線', [], null, null, 'kCandle'),
    ])
    tagProxy.createTag.mockResolvedValue(new TradeTag(9, 'setup', '回踩'))
    recordProxy.recordTrade.mockResolvedValue(buildSpotRecord({ status: 'open' }))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')
    await wrapper.get('[data-testid="trade-planned-stop-loss"]').setValue('1000')
    await wrapper.get('[data-testid="trade-planned-take-profit"]').setValue('1150')
    await wrapper.get('[data-testid="fill-price"]').setValue('1050')
    await wrapper.get('[data-testid="fill-quantity"]').setValue('1000')
    await wrapper.get('[data-testid="fill-fee"]').setValue('117')
    await wrapper.get('[data-testid="fill-time"]').setValue('2026-09-01T09:00')
    await wrapper.get('[data-testid="trade-entry-reason"]').setValue('回檔')
    await wrapper.get('[data-testid="app-rating-4"]').trigger('click')
    expect(wrapper.get('[data-testid="trade-trading-strategy"]').findAll('option').map(option => option.text()))
      .toEqual(['不關聯（自行判斷）', '台股均線'])
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('7')
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('')
    await wrapper.get('[data-testid="trade-trading-strategy"]').setValue('7')
    await wrapper.get('[data-testid="tag-picker-input"]').setValue('回踩')
    await wrapper.get('[data-testid="tag-picker-create"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="tag-option-1"]').trigger('click')

    expect(wrapper.text()).toContain('往下 4.76%')
    expect(wrapper.text()).toContain('往上 9.52%')

    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    const writeDto = recordProxy.recordTrade.mock.calls[0]?.[0]
    expect(writeDto).toMatchObject({ entryReason: '回檔', confidence: 4, tradingStrategyId: 7, setupTagIds: [9, 1] })
    expect(writeDto.firstBuyFill.fee.toString()).toBe('117')
    expect(writeDto.firstBuyFill.filledAt.toISOString()).toBe('2026-09-01T09:00:00.000Z')
  })

  it('加一筆賣出再移除；新增標籤重名時寫在表單上方', async () => {
    tagProxy.createTag.mockRejectedValue(new TradeRejectedError('已有同名的型態標籤', null))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="fill-add-sell"]').trigger('click')
    expect(wrapper.findAll('[data-testid="fill-kind"]')).toHaveLength(2)
    await wrapper.findAll('[data-testid="fill-remove"]')[1]?.trigger('click')
    expect(wrapper.findAll('[data-testid="fill-kind"]')).toHaveLength(1)

    await wrapper.get('[data-testid="tag-picker-input"]').setValue('突破')
    await wrapper.get('[data-testid="tag-picker-create"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="form-rejection"]').text()).toContain('已有同名的型態標籤')
  })

  it('讀不到策略與標籤時提醒；改過內容通知上層', async () => {
    tradingStrategyProxy.listTradingStrategies.mockRejectedValue(new TradeRejectedError('讀不到交易策略', null))
    const wrapper = mountForm()
    await flushPromises()

    await wrapper.get('[data-testid="trade-symbol"]').setValue('2330')

    expect(wrapper.get('[data-testid="reference-failure"]').text()).toContain('讀不到交易策略')
    expect(wrapper.emitted('dirtyChange')?.at(-1)).toEqual([true])
  })
})

describe('SpotTradeForm：從連結打開', () => {
  it('買入：預填標的、止損止盈與買進價、數量，標示請改成實際成交', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    const wrapper = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()

    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('買入')
    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('來自 台積電趨勢・第 88 輪')
    expect(wrapper.get('[data-testid="prefill-source"]').text()).toContain('參考價 1,050')
    expect((wrapper.get('[data-testid="trade-symbol"]').element as HTMLInputElement).value).toBe('2330')
    expect((wrapper.get('[data-testid="fill-quantity"]').element as HTMLInputElement).value).toBe('100')
    expect(wrapper.get('[data-testid="fill-price-confirm"]').text()).toBe('請改成實際成交')
    expect(wrapper.get('[data-testid="fill-quantity-confirm"]').text()).toBe('請改成實際成交')
    expect(wrapper.emitted('redirect')).toBeUndefined()
  })

  it('知道是台股後，數量不是整數立刻提示', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill())
    const wrapper = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()

    await wrapper.get('[data-testid="fill-quantity"]').setValue('100.5')

    expect(wrapper.get('[data-testid="fill-whole-shares"]').text()).toBe('台股數量以股計，必須是整數')
  })

  it.each([
    ['買入但已有持有中', 'addBuyFill', 'buy', '/spot-trade-journal/5?addFill=buy&journalLink=link-88'],
    ['出場且有持有中', 'addSellFill', 'sell', '/spot-trade-journal/5?addFill=sell&journalLink=link-88'],
  ] as const)('%s：交給上層轉去那一筆', async (_name, mode, signal, path) => {
    recordProxy.findJournalLink.mockResolvedValue(prefill(mode, signal))
    const wrapper = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()

    expect(wrapper.emitted('redirect')).toEqual([[path]])
  })

  it('出場但沒有持有中：說明沒有，留在新增頁可以記一筆', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill('noOpenHolding', 'sell'))
    const wrapper = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()

    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('沒有持有中的 2330')
    expect(wrapper.emitted('redirect')).toBeUndefined()
    expect(wrapper.find('[data-testid="trade-save"]').exists()).toBe(true)
  })

  it('讀取預填中不能儲存；儲存中也不能再按一次', async () => {
    recordProxy.findJournalLink.mockReturnValue(new Promise(() => {}))
    const loading = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()
    expect(loading.find('[data-testid="prefill-loading"]').exists()).toBe(true)
    expect(loading.get('[data-testid="trade-save"]').attributes('disabled')).toBeDefined()

    recordProxy.recordTrade.mockReturnValue(new Promise(() => {}))
    const saving = mountForm()
    await flushPromises()
    await saving.get('[data-testid="trade-symbol"]').setValue('2330')
    await saving.get('[data-testid="fill-price"]').setValue('1050')
    await saving.get('[data-testid="fill-quantity"]').setValue('1000')
    await saving.get('[data-testid="spot-trade-form"]').trigger('submit')
    await saving.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(saving.get('[data-testid="trade-save"]').text()).toBe('儲存中…')
    expect(saving.get('[data-testid="trade-save"]').attributes('disabled')).toBeDefined()
    expect(recordProxy.recordTrade).toHaveBeenCalledTimes(1)
  })

  it('那一輪已不在紀錄中：說找不到並提供前往交易日誌', async () => {
    recordProxy.findJournalLink.mockRejectedValue(new JournalLinkNotFoundError('找不到這一輪'))
    const wrapper = mountForm({ journalLinkIdentifier: 'link-88' })
    await flushPromises()

    expect(wrapper.get('[data-testid="prefill-message"]').text()).toContain('這一輪的建議已不在紀錄中')
    expect(wrapper.get('[data-testid="prefill-go-journal"]').attributes('href')).toBe('/spot-trade-journal')
  })
})

describe('SpotTradeForm：對既有交易加一筆', () => {
  it('出場連結帶進來的是賣出，預填全部持有', async () => {
    recordProxy.findJournalLink.mockResolvedValue(prefill('addSellFill', 'sell'))
    recordProxy.addFill.mockResolvedValue(buildSpotRecord())
    const wrapper = mountForm({
      existingRecord: buildSpotRecord({ status: 'open' }).toDomain().toDto(),
      journalLinkIdentifier: 'link-88',
      initialFillKind: 'sell',
    })
    await flushPromises()

    expect(wrapper.find('[data-testid="trade-symbol"]').exists()).toBe(false)
    expect((wrapper.get('[data-testid="fill-kind"]').element as HTMLSelectElement).value).toBe('sell')
    expect((wrapper.get('[data-testid="fill-quantity"]').element as HTMLInputElement).value).toBe('600')

    await wrapper.get('[data-testid="spot-trade-form"]').trigger('submit')
    await flushPromises()

    expect(recordProxy.addFill.mock.calls[0]?.[1]).toMatchObject({ kind: 'sell' })
    expect(wrapper.emitted('saved')).toHaveLength(1)
  })

  it('從詳情頁的加一筆賣出打開時，第一列就是賣出', async () => {
    const wrapper = mountForm({ existingRecord: buildSpotRecord({ status: 'open' }).toDomain().toDto(), initialFillKind: 'sell' })
    await flushPromises()

    expect((wrapper.get('[data-testid="fill-kind"]').element as HTMLSelectElement).value).toBe('sell')
    expect(wrapper.get('[data-testid="trade-save"]').text()).toBe('儲存')
  })
})
