import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleSearchPanel from '~/components/organisms/KCandleSearchPanel.vue'
import SymbolField from '~/components/molecules/SymbolField.vue'
import { KCandleApplication } from '~/application/k-candle-application'
import { buildTradingSymbolApplication } from '../../fixtures/trading-symbol-application'
import { KCandleService } from '~/domain/service/k-candle-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-08-30T12:00:00.000Z')

function buildKCandle(openTime: string): KCandle {
  return new KCandle(
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
  )
}

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn().mockResolvedValue([]),
    findKCandleSeries: vi.fn(),
    saveKCandle: vi.fn(),
    updateKCandle: vi.fn(),
    deleteKCandle: vi.fn(),
    ...overrides,
  }
}

async function mountPanel(kCandleProxy: IKCandleProxy) {
  const wrapper = mount(KCandleSearchPanel, {
    props: {
      kCandleApplication: new KCandleApplication(new KCandleService(kCandleProxy)),
      tradingSymbolApplication: buildTradingSymbolApplication(),
    },
  })
  // 預設區間與交易標的清單都在 onMounted 才帶入，等它們都到齊再讓測試往下走。
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleSearchPanel', () => {
  it('進入畫面時帶入最近二十四小時的預設區間', async () => {
    const wrapper = await mountPanel(buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) }))

    expect(wrapper.get<HTMLSelectElement>('[data-testid="symbol-select"]').element.value).toBe('BTCUSDT')
    expect(wrapper.get<HTMLInputElement>('[data-testid="start-time-input"]').element.value)
      .toBe('2026-08-29T12:00')
    expect(wrapper.get<HTMLInputElement>('[data-testid="end-time-input"]').element.value)
      .toBe('2026-08-30T12:00')
  })

  it('以使用者輸入的區間查詢，並列出查到的 K 線', async () => {
    const kCandleProxy = buildProxy({
      findKCandlesInRange: vi.fn().mockResolvedValue([
        buildKCandle('2026-08-30T10:05:00.000Z'),
        buildKCandle('2026-08-30T10:00:00.000Z'),
      ]),
    })
    const wrapper = await mountPanel(kCandleProxy)

    await wrapper.get('[data-testid="end-time-input"]').setValue('2026-08-30T18:30')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledWith(expect.objectContaining({
      symbol: 'BTCUSDT',
      startTime: new Date('2026-08-29T12:00:00.000Z'),
      endTime: new Date('2026-08-30T18:30:00.000Z'),
    }))
    expect(wrapper.findAll('[data-testid="k-candle-row"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="result-count"]').text()).toBe('共 2 根')
  })

  it('查無資料時顯示查無 K 線而不是錯誤', async () => {
    const wrapper = await mountPanel(buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="empty-result"]').text()).toContain('查無 K 線')
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
  })

  it.each([
    { description: '結束時間早於開始時間', input: '[data-testid="end-time-input"]', value: '2026-08-28T12:00', expectedMessage: '結束時間不得早於開始時間' },
    { description: '開始時間被清空', input: '[data-testid="start-time-input"]', value: '', expectedMessage: '請填寫開始時間' },
    { description: '結束時間被清空', input: '[data-testid="end-time-input"]', value: '', expectedMessage: '請填寫結束時間' },
  ])('$description 時標在欄位旁且完全不去查詢', async ({ input, value, expectedMessage }) => {
    const kCandleProxy = buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) })
    const wrapper = await mountPanel(kCandleProxy)

    await wrapper.get(input).setValue(value)
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe(expectedMessage)
    expect(kCandleProxy.findKCandlesInRange).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
  })

  it('交易標的交出一個空的值時，訊息標在那一欄旁邊', async () => {
    const kCandleProxy = buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) })
    const wrapper = await mountPanel(kCandleProxy)

    // 選單挑不出空值，但欄位的契約仍然是「交出什麼，這裡就用什麼」——
    // 直接讓欄位交出一個空的標的，驗畫面確實把原因標回那一欄旁邊。
    wrapper.findComponent(SymbolField).vm.$emit('update:modelValue', '   ')
    await wrapper.vm.$nextTick()
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請指定交易標的')
    expect(kCandleProxy.findKCandlesInRange).not.toHaveBeenCalled()
  })

  it('開始時間與結束時間相同時照常查詢', async () => {
    const kCandleProxy = buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) })
    const wrapper = await mountPanel(kCandleProxy)

    await wrapper.get('[data-testid="start-time-input"]').setValue('2026-08-30T12:00')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })

  it('查詢區間可以是不對齊五分鐘刻度的時間', async () => {
    const kCandleProxy = buildProxy({ findKCandlesInRange: vi.fn().mockResolvedValue([]) })
    const wrapper = await mountPanel(kCandleProxy)

    await wrapper.get('[data-testid="start-time-input"]').setValue('2026-08-30T10:07')
    await wrapper.get('[data-testid="end-time-input"]').setValue('2026-08-30T11:23')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledWith(expect.objectContaining({
      startTime: new Date('2026-08-30T10:07:00.000Z'),
      endTime: new Date('2026-08-30T11:23:00.000Z'),
    }))
    expect(wrapper.find('[data-testid="field-error"]').exists()).toBe(false)
  })

  it('被後端以業務規則拒絕時整塊轉達原因，且不顯示任何 K 線', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(
        new BackendRequestRejectedError('時間區間過大，請縮小區間（單次最多 1000 根）'),
      ),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="rejected-alert"]').text())
      .toContain('時間區間過大，請縮小區間（單次最多 1000 根）')
    expect(wrapper.findAll('[data-testid="k-candle-row"]')).toHaveLength(0)
    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
  })

  it('後端自己出錯時，說清楚不是查詢條件有問題', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(new BackendServerError('讀取 K 線失敗')),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const alert = wrapper.get('[data-testid="server-error-alert"]')
    expect(alert.text()).toContain('不是你的查詢條件有問題')
    expect(alert.text()).toContain('讀取 K 線失敗')
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
  })

  it('連不上後端時告知並提供重試', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="unreachable-alert"]').text()).toContain('連不上後端')
    expect(wrapper.find('[data-testid="rejected-alert"]').exists()).toBe(false)
  })

  it('未預期的錯誤也整塊告知', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandlesInRange: vi.fn().mockRejectedValue(new Error('boom')),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.get('[data-testid="rejected-alert"]').text()).toContain('查詢時發生未預期的錯誤')
  })

  it('先前失敗的訊息在下一次成功查詢後消失', async () => {
    const wrapper = await mountPanel(buildProxy({
      findKCandlesInRange: vi.fn()
        .mockRejectedValueOnce(new BackendUnreachableError('/k-candles'))
        .mockResolvedValueOnce([buildKCandle('2026-08-30T10:00:00.000Z')]),
    }))

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(true)

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.find('[data-testid="unreachable-alert"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-testid="k-candle-row"]')).toHaveLength(1)
  })

  it('查詢進行中呈現載入狀態且送出按鈕不可再觸發', async () => {
    const pendingSearch = new Promise<KCandle[]>(() => {})
    const wrapper = await mountPanel(buildProxy({ findKCandlesInRange: vi.fn().mockReturnValue(pendingSearch) }))

    await wrapper.get('form').trigger('submit')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('[data-testid="loading-alert"]').text()).toContain('查詢中')
    expect(wrapper.get('[data-testid="submit-button"]').attributes('disabled')).toBeDefined()
  })

  describe('維護入口', () => {
    it('按「新增 K 線」會打開空白的維護表單', async () => {
      const wrapper = await mountPanel(buildProxy())

      await wrapper.get('[data-testid="create-button"]').trigger('click')

      expect(wrapper.find('[data-testid="overwrite-notice"]').exists()).toBe(true)
      expect(wrapper.get<HTMLInputElement>('[data-testid="form-close"]').element.value).toBe('')
    })

    it('新增時預先帶入目前正在瀏覽的交易標的', async () => {
      const wrapper = await mountPanel(buildProxy())

      await wrapper.get('[data-testid="symbol-select"]').setValue('ETHUSDT')
      await wrapper.get('[data-testid="create-button"]').trigger('click')

      expect(wrapper.get<HTMLInputElement>('[data-testid="form-symbol"]').element.value).toBe('ETHUSDT')
    })

    it('維護請求進行中時不得切換到別根', async () => {
      const pendingUpdate = new Promise(() => {})
      const kCandleProxy = buildProxy({
        findKCandlesInRange: vi.fn().mockResolvedValue([
          buildKCandle('2026-08-30T10:00:00.000Z'),
          buildKCandle('2026-08-30T10:05:00.000Z'),
        ]),
        updateKCandle: vi.fn().mockReturnValue(pendingUpdate),
      })
      const wrapper = await mountPanel(kCandleProxy)

      await wrapper.get('form').trigger('submit')
      await flushPromises()
      await wrapper.findAll('[data-testid="edit-button"]')[0]?.trigger('click')
      await flushPromises()
      // 畫面上有兩張表單：查詢在前、維護在後。
      await wrapper.findAll('form')[1]?.trigger('submit')
      await wrapper.vm.$nextTick()

      const editButtons = wrapper.findAll('[data-testid="edit-button"]')
      expect(editButtons[1]?.attributes('disabled')).toBeDefined()
    })

    it('對某一列按「編輯」會帶入那一根的資料', async () => {
      const wrapper = await mountPanel(buildProxy({
        findKCandlesInRange: vi.fn().mockResolvedValue([buildKCandle('2026-08-30T10:00:00.000Z')]),
      }))

      await wrapper.get('form').trigger('submit')
      await flushPromises()
      await wrapper.get('[data-testid="edit-button"]').trigger('click')
      await flushPromises()

      expect(wrapper.get<HTMLInputElement>('[data-testid="form-open-time"]').element.value)
        .toBe('2026-08-30T10:00')
      expect(wrapper.get('[data-testid="form-symbol"]').attributes('disabled')).toBeDefined()
    })

    it('維護成功後自動重查一次', async () => {
      const kCandleProxy = buildProxy({
        findKCandlesInRange: vi.fn().mockResolvedValue([buildKCandle('2026-08-30T10:00:00.000Z')]),
      })
      const wrapper = await mountPanel(kCandleProxy)

      await wrapper.get('form').trigger('submit')
      await flushPromises()
      expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledTimes(1)

      await wrapper.get('[data-testid="edit-button"]').trigger('click')
      await flushPromises()
      await wrapper.get('[data-testid="delete-button"]').trigger('click')
      await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
      await flushPromises()

      expect(kCandleProxy.deleteKCandle).toHaveBeenCalledTimes(1)
      expect(kCandleProxy.findKCandlesInRange).toHaveBeenCalledTimes(2)
    })

    it('在維護中按取消會回到只有查詢結果的畫面', async () => {
      const wrapper = await mountPanel(buildProxy())

      await wrapper.get('[data-testid="create-button"]').trigger('click')
      await wrapper.get('[data-testid="form-cancel"]').trigger('click')

      expect(wrapper.find('[data-testid="form-symbol"]').exists()).toBe(false)
    })
  })
})
