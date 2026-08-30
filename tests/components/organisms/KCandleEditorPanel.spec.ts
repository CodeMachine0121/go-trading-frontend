import Decimal from 'decimal.js'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import KCandleEditorPanel from '~/components/organisms/KCandleEditorPanel.vue'
import { KCandleApplication } from '~/application/k-candle-application'
import { KCandleService } from '~/domain/service/k-candle-service'
import type { IKCandleProxy } from '~/domain/interface/i-k-candle-proxy'
import { KCandle } from '~/domain/models/entities/k-candle'
import { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import { KCandleTrendVo } from '~/domain/models/vo/k-candle-trend-vo'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

// 只 mock 最外層的 proxy 介面；application、domain service 與 domain model 都是真的。
const CURRENT_TIME = new Date('2026-08-30T12:07:00.000Z')
const EDITING_OPEN_TIME = new Date('2026-08-30T09:00:00.000Z')

function buildProxy(overrides: Partial<IKCandleProxy> = {}): IKCandleProxy {
  return {
    findKCandlesInRange: vi.fn().mockResolvedValue([]),
    saveKCandle: vi.fn().mockResolvedValue(buildKCandle()),
    updateKCandle: vi.fn().mockResolvedValue(buildKCandle()),
    deleteKCandle: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function buildKCandle(): KCandle {
  return new KCandle(
    'BTCUSDT', EDITING_OPEN_TIME,
    new Decimal('100'), new Decimal('120'), new Decimal('90'), new Decimal('110'),
    new Decimal('11'), new Decimal('1200'), new Decimal('5'), new Decimal('600'),
  )
}

function buildEditingKCandleDto(): KCandleDto {
  return new KCandleDto(
    'BTCUSDT', EDITING_OPEN_TIME,
    new Decimal('100'), new Decimal('120'), new Decimal('90'), new Decimal('110'),
    new Decimal('11'), new Decimal('1200'), new Decimal('5'), new Decimal('600'),
    new KCandleTrendVo('up', '上漲', 'success'),
  )
}

async function mountPanel(
  kCandleProxy: IKCandleProxy,
  editingKCandle: KCandleDto | null = null,
  defaultSymbol = 'BTCUSDT',
) {
  const wrapper = mount(KCandleEditorPanel, {
    props: {
      kCandleApplication: new KCandleApplication(new KCandleService(kCandleProxy)),
      editingKCandle,
      defaultSymbol,
    },
  })
  await wrapper.vm.$nextTick()

  return wrapper
}

async function fillFigures(wrapper: Awaited<ReturnType<typeof mountPanel>>) {
  for (const [field, value] of Object.entries({
    open: '100', high: '120', low: '90', close: '110',
    volume: '11', quoteVolume: '1200', takerBuyBaseVolume: '5', takerBuyQuoteVolume: '600',
  })) {
    await wrapper.get(`[data-testid="form-${field}"]`).setValue(value)
  }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(CURRENT_TIME)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('KCandleEditorPanel', () => {
  describe('新增', () => {
    it('起始時間預設對齊到最近的五分鐘刻度', async () => {
      const wrapper = await mountPanel(buildProxy())

      expect(wrapper.get<HTMLInputElement>('[data-testid="form-open-time"]').element.value)
        .toBe('2026-08-30T12:05')
      expect(wrapper.get('[data-testid="overwrite-notice"]').text()).toContain('覆蓋')
    })

    it('交易標的預先帶入外面正在瀏覽的那一個', async () => {
      const wrapper = await mountPanel(buildProxy(), null, 'ETHUSDT')

      expect(wrapper.get<HTMLInputElement>('[data-testid="form-symbol"]').element.value).toBe('ETHUSDT')
    })

    it('填妥送出後新增成功並回饋，且通知外面重查', async () => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy)

      await fillFigures(wrapper)
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(kCandleProxy.saveKCandle).toHaveBeenCalledTimes(1)
      expect(wrapper.get('[data-testid="editor-success"]').text()).toContain('已新增這根 K 線')
      expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it.each([
      { description: '起始時間不在刻度上', field: 'form-open-time', value: '2026-08-30T12:03', expectedMessage: '起始時間必須落在5分鐘刻度上' },
      { description: '起始時間指向未來', field: 'form-open-time', value: '2026-08-30T12:10', expectedMessage: '起始時間不得指向未來' },
      { description: '交易標的留空', field: 'form-symbol', value: '', expectedMessage: '請指定交易標的' },
    ])('$description 時標在欄位旁且完全不寫入', async ({ field, value, expectedMessage }) => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy)

      await fillFigures(wrapper)
      await wrapper.get(`[data-testid="${field}"]`).setValue(value)
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="field-error"]').text()).toBe(expectedMessage)
      expect(kCandleProxy.saveKCandle).not.toHaveBeenCalled()
    })

    it.each([
      { description: '收盤價留空', field: 'form-close', value: '', expectedMessage: '請填寫收盤價' },
      { description: '收盤價不是數字', field: 'form-close', value: '一百', expectedMessage: '收盤價必須是數字' },
      { description: '成交量為負', field: 'form-volume', value: '-1', expectedMessage: '價格與成交數字不得為負數' },
    ])('$description 時標在欄位旁', async ({ field, value, expectedMessage }) => {
      const wrapper = await mountPanel(buildProxy())

      await fillFigures(wrapper)
      await wrapper.get(`[data-testid="${field}"]`).setValue(value)
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="field-error"]').text()).toBe(expectedMessage)
    })

    it('最高價低於最低價時標在最高價旁', async () => {
      const wrapper = await mountPanel(buildProxy())

      await fillFigures(wrapper)
      await wrapper.get('[data-testid="form-high"]').setValue('90')
      await wrapper.get('[data-testid="form-low"]').setValue('100')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="field-error"]').text()).toBe('最高價不得低於最低價')
    })
  })

  describe('修改', () => {
    it('帶入那一根的所有數字，且身分唯讀', async () => {
      const wrapper = await mountPanel(buildProxy(), buildEditingKCandleDto())

      expect(wrapper.get<HTMLInputElement>('[data-testid="form-symbol"]').element.value).toBe('BTCUSDT')
      expect(wrapper.get<HTMLInputElement>('[data-testid="form-open-time"]').element.value)
        .toBe('2026-08-30T09:00')
      expect(wrapper.get<HTMLInputElement>('[data-testid="form-close"]').element.value).toBe('110')
      expect(wrapper.get('[data-testid="form-symbol"]').attributes('disabled')).toBeDefined()
      expect(wrapper.get('[data-testid="form-open-time"]').attributes('disabled')).toBeDefined()
      expect(wrapper.find('[data-testid="overwrite-notice"]').exists()).toBe(false)
    })

    it('送出後更新成功並回饋', async () => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="form-close"]').setValue('120')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(kCandleProxy.updateKCandle).toHaveBeenCalledTimes(1)
      expect(wrapper.get('[data-testid="editor-success"]').text()).toContain('已更新這根 K 線')
      expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('改出不合理的數字時標在欄位旁且完全不寫入', async () => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="form-high"]').setValue('90')
      await wrapper.get('[data-testid="form-low"]').setValue('100')
      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="field-error"]').text()).toBe('最高價不得低於最低價')
      expect(kCandleProxy.updateKCandle).not.toHaveBeenCalled()
    })

    it('那一根已經不存在時，整塊轉達後端說的原因', async () => {
      const kCandleProxy = buildProxy({
        updateKCandle: vi.fn().mockRejectedValue(new BackendRequestRejectedError('找不到該根 K 線')),
      })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="editor-rejected"]').text()).toContain('找不到該根 K 線')
      expect(wrapper.emitted('changed')).toBeUndefined()
    })

    it('後端自己出錯時，說清楚不是填的內容有問題', async () => {
      const kCandleProxy = buildProxy({
        updateKCandle: vi.fn().mockRejectedValue(new BackendServerError('寫入 K 線失敗')),
      })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      const alert = wrapper.get('[data-testid="editor-server-error"]')
      expect(alert.text()).toContain('不是你填的內容有問題')
      expect(alert.text()).toContain('寫入 K 線失敗')
      expect(wrapper.find('[data-testid="editor-rejected"]').exists()).toBe(false)
    })

    it('連不上後端時分開告知', async () => {
      const kCandleProxy = buildProxy({
        updateKCandle: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
      })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="editor-unreachable"]').text()).toContain('連不上後端')
    })

    it('未預期的錯誤也整塊告知', async () => {
      const kCandleProxy = buildProxy({ updateKCandle: vi.fn().mockRejectedValue(new Error('boom')) })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('form').trigger('submit')
      await flushPromises()

      expect(wrapper.get('[data-testid="editor-rejected"]').text()).toContain('未預期的錯誤')
    })
  })

  describe('刪除', () => {
    it('新增狀態沒有刪除按鈕', async () => {
      const wrapper = await mountPanel(buildProxy())

      expect(wrapper.find('[data-testid="delete-button"]').exists()).toBe(false)
    })

    it('按下刪除後要再確認一次才真的刪', async () => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="delete-button"]').trigger('click')

      expect(wrapper.get('[data-testid="delete-confirm"]').text()).toContain('確定刪除')
      expect(kCandleProxy.deleteKCandle).not.toHaveBeenCalled()

      await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
      await flushPromises()

      expect(kCandleProxy.deleteKCandle).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'BTCUSDT', openTime: EDITING_OPEN_TIME }),
      )
      expect(wrapper.get('[data-testid="editor-success"]').text()).toContain('已刪除這根 K 線')
      expect(wrapper.emitted('changed')).toHaveLength(1)
    })

    it('刪除成功後表單就收起來，不可能再送出一次更新', async () => {
      const wrapper = await mountPanel(buildProxy(), buildEditingKCandleDto())

      await wrapper.get('[data-testid="delete-button"]').trigger('click')
      await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="editor-success"]').text()).toContain('已刪除這根 K 線')
      expect(wrapper.find('[data-testid="form-symbol"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="form-submit"]').exists()).toBe(false)

      await wrapper.get('[data-testid="editor-close"]').trigger('click')
      expect(wrapper.emitted('cancel')).toHaveLength(1)
    })

    it('送出進行中時，刪除的確認列會收起來且不可觸發', async () => {
      const pendingUpdate = new Promise(() => {})
      const kCandleProxy = buildProxy({ updateKCandle: vi.fn().mockReturnValue(pendingUpdate) })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="delete-button"]').trigger('click')
      expect(wrapper.find('[data-testid="delete-confirm"]').exists()).toBe(true)

      await wrapper.get('form').trigger('submit')
      await wrapper.vm.$nextTick()

      expect(wrapper.find('[data-testid="delete-confirm"]').exists()).toBe(false)
      expect(kCandleProxy.deleteKCandle).not.toHaveBeenCalled()
    })

    it('在確認時反悔就不刪', async () => {
      const kCandleProxy = buildProxy()
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="delete-button"]').trigger('click')
      await wrapper.get('[data-testid="delete-confirm-no"]').trigger('click')

      expect(wrapper.find('[data-testid="delete-confirm"]').exists()).toBe(false)
      expect(kCandleProxy.deleteKCandle).not.toHaveBeenCalled()
    })

    it('要刪的那根已經不存在時，整塊轉達後端說的原因', async () => {
      const kCandleProxy = buildProxy({
        deleteKCandle: vi.fn().mockRejectedValue(new BackendRequestRejectedError('找不到該根 K 線')),
      })
      const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

      await wrapper.get('[data-testid="delete-button"]').trigger('click')
      await wrapper.get('[data-testid="delete-confirm-yes"]').trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="editor-rejected"]').text()).toContain('找不到該根 K 線')
    })
  })

  it('請求進行中與結束時把忙碌狀態往外送', async () => {
    const kCandleProxy = buildProxy()
    const wrapper = await mountPanel(kCandleProxy)

    await fillFigures(wrapper)
    await wrapper.get('form').trigger('submit')
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('busyChange')?.at(0)).toEqual([true])

    await flushPromises()
    expect(wrapper.emitted('busyChange')?.at(-1)).toEqual([false])
  })

  it('請求失敗時也要把忙碌狀態解除', async () => {
    const kCandleProxy = buildProxy({
      updateKCandle: vi.fn().mockRejectedValue(new BackendUnreachableError('/k-candles')),
    })
    const wrapper = await mountPanel(kCandleProxy, buildEditingKCandleDto())

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('busyChange')?.at(-1)).toEqual([false])
  })

  it('按取消時把放棄這件事往上送', async () => {
    const wrapper = await mountPanel(buildProxy())

    await wrapper.get('[data-testid="form-cancel"]').trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
  })
})
