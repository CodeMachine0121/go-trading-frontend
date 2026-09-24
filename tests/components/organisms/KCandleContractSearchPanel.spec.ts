import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleContractSearchPanel from '~/components/organisms/KCandleContractSearchPanel.vue'
import ContractSymbolField from '~/components/molecules/ContractSymbolField.vue'
import { KCandleApplication } from '~/application/k-candle-application'
import { KCandleService } from '~/domain/service/k-candle-service'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import type { IKCandleContractProxy } from '~/domain/interface/i-k-candle-contract-proxy'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandleContract } from '~/domain/models/entities/k-candle-contract'
import { ContractPriceLineVo } from '~/domain/models/vo/contract-price-line-vo'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { buildTimeZone } from '../../fixtures/time-zone'
import {
  buildContractTradingSymbol, buildContractTradingSymbolProxy, buildKCandleContractProxy,
} from '../../fixtures/contract-proxies'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-09-23T12:00:00.000Z')

function priceLine(close: string): ContractPriceLineVo {
  return new ContractPriceLineVo(new Decimal(close), new Decimal(close), new Decimal(close), new Decimal(close))
}

function buildKCandleContract(
  openTime: string, laterLines: { indexClose: string, premiumIndexClose: string } | null,
): KCandleContract {
  return new KCandleContract(
    'BTCUSDT', new Date(openTime),
    new Decimal('100'), new Decimal('120'), new Decimal('90'), new Decimal('110'),
    new Decimal('11'), new Decimal('1200'), new Decimal('5'), new Decimal('600'),
    42, priceLine('110.6'),
    laterLines === null ? null : priceLine(laterLines.indexClose),
    laterLines === null ? null : priceLine(laterLines.premiumIndexClose),
  )
}

function buildSpotProxy(): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn().mockResolvedValue([]),
    findKCandleSeries: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    catchUpSymbol: vi.fn(),
  }
}

async function mountPanel(kCandleContractProxy: IKCandleContractProxy, spotProxy = buildSpotProxy()) {
  const wrapper = mount(KCandleContractSearchPanel, {
    props: {
      kCandleApplication: new KCandleApplication(new KCandleService(spotProxy, kCandleContractProxy)),
      tradingSymbolApplication: new TradingSymbolApplication(new TradingSymbolService(
        { findTradingSymbols: vi.fn() },
        buildContractTradingSymbolProxy([buildContractTradingSymbol('BTCUSDT'), buildContractTradingSymbol('ETHUSDT')]))),
      timeZone: buildTimeZone('UTC'),
    },
  })
  await flushPromises()

  return wrapper
}

async function search(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
  await wrapper.get('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleContractSearchPanel', () => {
  it('一進來從合約標的清單預選 BTCUSDT，開始時間是二十四小時前', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy())

    expect(wrapper.get<HTMLSelectElement>('[data-testid="contract-symbol-select"]').element.value).toBe('BTCUSDT')
    expect(wrapper.get<HTMLInputElement>('[data-testid="start-time-input"]').element.value).toBe('2026-09-22T12:00')
    expect(wrapper.find('[data-testid="symbol-select"]').exists()).toBe(false)
  })

  it('由新到舊列出，每一根帶著三條線的收盤與成交筆數；負的溢價照原樣', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockResolvedValue([
        buildKCandleContract('2026-09-23T08:00:00.000Z', { indexClose: '110.7', premiumIndexClose: '0.0001' }),
        buildKCandleContract('2026-09-23T08:01:00.000Z', { indexClose: '110.8', premiumIndexClose: '-0.0005' }),
      ]),
    }))

    await search(wrapper)

    const rows = wrapper.findAll('[data-testid="k-candle-contract-row"]')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.text()).toContain('08:01')
    expect(rows[0]?.get('[data-testid="trade-count"]').text()).toBe('42')
    expect(rows[0]?.get('[data-testid="mark-price-close"]').text()).toBe('110.6')
    expect(rows[0]?.get('[data-testid="index-price-close"]').text()).toBe('110.8')
    expect(rows[0]?.get('[data-testid="premium-index-close"]').text()).toBe('-0.0005')
    expect(wrapper.get('[data-testid="result-count"]').text()).toBe('共 2 根')
  })

  it('舊合約 K 線沒有的那兩格畫成「—」，不是 0', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockResolvedValue([
        buildKCandleContract('2026-09-23T08:00:00.000Z', null),
      ]),
    }))

    await search(wrapper)

    expect(wrapper.get('[data-testid="index-price-close"]').text()).toBe('—')
    expect(wrapper.get('[data-testid="premium-index-close"]').text()).toBe('—')
  })

  it('只問合約那一條線', async () => {
    const spotProxy = buildSpotProxy()
    const findKCandleContractsInRange = vi.fn().mockResolvedValue([])
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractsInRange }), spotProxy)

    await search(wrapper)

    expect(findKCandleContractsInRange).toHaveBeenCalledTimes(1)
    expect(spotProxy.findKCandlesInRange).not.toHaveBeenCalled()
  })

  it('沒有挑合約時不送出，挑合約那一格旁寫原因', async () => {
    const findKCandleContractsInRange = vi.fn()
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractsInRange }))
    wrapper.findComponent(ContractSymbolField).vm.$emit('update:modelValue', '')
    await flushPromises()

    await search(wrapper)

    expect(findKCandleContractsInRange).not.toHaveBeenCalled()
    expect(wrapper.findComponent(ContractSymbolField).get('[data-testid="field-error"]').text())
      .toBe('請指定交易標的')
  })

  it('開始時間在未來時不送出，開始時間旁寫原因', async () => {
    const findKCandleContractsInRange = vi.fn()
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractsInRange }))
    await wrapper.get('[data-testid="start-time-input"]').setValue('2126-09-23T12:00')

    await search(wrapper)

    expect(findKCandleContractsInRange).not.toHaveBeenCalled()
    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('開始時間不得晚於目前時間')
  })

  it('連不上後端時說連不上，並給一顆重試', async () => {
    const findKCandleContractsInRange = vi.fn()
      .mockRejectedValueOnce(new BackendUnreachableError('/contract-k-candles'))
      .mockResolvedValueOnce([buildKCandleContract('2026-09-23T08:00:00.000Z', null)])
    const wrapper = await mountPanel(buildKCandleContractProxy({ findKCandleContractsInRange }))

    await search(wrapper)
    expect(wrapper.get('[data-testid="unreachable-alert"]').text()).toContain('連不上後端')

    await wrapper.get('[data-testid="unreachable-alert"]').get('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="k-candle-contract-row"]')).toHaveLength(1)
  })

  it.each([
    ['被拒絕', new BackendRequestRejectedError('時間區間過大，請縮小區間'), 'rejected-alert', '時間區間過大，請縮小區間'],
    ['後端出錯', new BackendServerError('database unavailable'), 'server-error-alert', 'database unavailable'],
  ])('%s時說出後端給的原因', async (_label, failure, alertTestId, message) => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockRejectedValue(failure),
    }))

    await search(wrapper)

    expect(wrapper.get(`[data-testid="${alertTestId}"]`).text()).toContain(message)
  })

  it('那段時間一根都沒有時說查無 K 線，不是錯誤', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy())

    await search(wrapper)

    expect(wrapper.get('[data-testid="empty-result"]').text()).toContain('查無 K 線')
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
  })

  it('這裡只讀：沒有新增、編輯的入口', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockResolvedValue([buildKCandleContract('2026-09-23T08:00:00.000Z', null)]),
    }))

    await search(wrapper)

    expect(wrapper.find('[data-testid="create-button"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="edit-button"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('新增 K 線')
  })

  it('換時區只換說法：開始時間那一格指的仍是同一個瞬間', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy())

    await wrapper.setProps({ timeZone: buildTimeZone('Asia/Taipei') })

    expect(wrapper.get<HTMLInputElement>('[data-testid="start-time-input"]').element.value).toBe('2026-09-22T20:00')
  })

  it('開始時間被清空時換時區不動它', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy())
    await wrapper.get('[data-testid="start-time-input"]').setValue('')

    await wrapper.setProps({ timeZone: buildTimeZone('Asia/Taipei') })

    expect(wrapper.get<HTMLInputElement>('[data-testid="start-time-input"]').element.value).toBe('')
  })

  it('說不出是哪一種失敗時，照樣說查詢失敗', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    await search(wrapper)

    expect(wrapper.get('[data-testid="rejected-alert"]').text()).toBe('查詢時發生未預期的錯誤。')
  })

  it('版面：查詢列就畫在「查詢結果」那張卡的頂端', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy())

    expect(wrapper.findAll('h2').map(title => title.text())).toEqual(['查詢結果'])
    expect(wrapper.get('.k-candle-contract-table').find('form').exists()).toBe(true)
  })

  it('表格的欄位：成交價那一組之後是成交筆數與三條線的收盤', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockResolvedValue([buildKCandleContract('2026-09-23T08:00:00.000Z', null)]),
    }))

    await search(wrapper)

    expect(wrapper.findAll('th').map(header => header.text())).toEqual([
      '起始時間（世界標準時間）', '漲跌', '開盤價', '最高價', '最低價', '收盤價', '成交量',
      '成交筆數', '標記價格收盤', '指數價格收盤', '溢價指數收盤',
    ])
  })

  it('查詢的時候說正在查', async () => {
    const wrapper = await mountPanel(buildKCandleContractProxy({
      findKCandleContractsInRange: vi.fn().mockReturnValue(new Promise(() => {})),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="loading-alert"]').text()).toBe('查詢中…')
  })
})
