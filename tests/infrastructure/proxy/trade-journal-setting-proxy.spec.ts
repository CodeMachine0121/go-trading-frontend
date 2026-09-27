import { afterEach, describe, expect, it, vi } from 'vitest'
import Decimal from 'decimal.js'
import { TradeJournalSettingProxy } from '~/infrastructure/proxy/trade-journal-setting-proxy'
import { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('TradeJournalSettingProxy', () => {
  it('讀回費率，沒有的就是沒有', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ makerFeeRate: '0.02', takerFeeRate: null })
    vi.stubGlobal('$fetch', fetchMock)

    const setting = await new TradeJournalSettingProxy(BASE_URL, signedInSessionStorage()).findSetting()

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/users/me/trade-journal-settings`)
    expect(setting.makerFeeRate?.toString()).toBe('0.02')
    expect(setting.takerFeeRate).toBeNull()
  })

  it('後端回空的也當作還沒設定', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(null))

    const setting = await new TradeJournalSettingProxy(BASE_URL, signedInSessionStorage()).findSetting()

    expect(setting.makerFeeRate).toBeNull()
    expect(setting.takerFeeRate).toBeNull()
  })

  it.each([
    ['只有吃單', null, new Decimal('0.05'), { makerFeeRate: null, takerFeeRate: '0.05' }],
    ['只有掛單', new Decimal('0.02'), null, { makerFeeRate: '0.02', takerFeeRate: null }],
  ])('以字串送出費率，沒有的送 null：%s', async (_, makerFeeRate, takerFeeRate, expectedBody) => {
    const fetchMock = vi.fn().mockResolvedValue({ makerFeeRate: '0.02', takerFeeRate: '0.05' })
    vi.stubGlobal('$fetch', fetchMock)

    const saved = await new TradeJournalSettingProxy(BASE_URL, signedInSessionStorage())
      .saveFeeRates(new TradeFeeRatesWriteDto(makerFeeRate, takerFeeRate))

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'PUT', body: expectedBody })
    expect(saved.takerFeeRate?.toString()).toBe('0.05')
  })
})
