import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import type { TradeFeeRatesWriteDto } from '~/domain/models/dto/trade-fee-rates-write-dto'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'

function buildFixture() {
  const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
  const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }

  return {
    application: new TradeJournalSettingApplication(new TradeJournalSettingService(
      settingProxy as unknown as ITradeJournalSettingProxy, tagProxy as unknown as ITradeTagProxy)),
    settingProxy,
    tagProxy,
  }
}

describe('TradeJournalSettingApplication.getSetting', () => {
  it('設定了兩個費率時說出來', async () => {
    const { application, settingProxy } = buildFixture()
    settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(new Decimal('0.02'), new Decimal('0.05')))

    const setting = await application.getSetting()

    expect(setting.configured).toBe(true)
    expect(setting.summary).toBe('掛單 0.02%・吃單 0.05%')
  })

  it.each([
    ['兩個都沒設', null, null],
    ['只設了一個', new Decimal('0.02'), null],
  ])('%s時寫還沒設定，不是錯誤', async (_, makerFeeRate, takerFeeRate) => {
    const { application, settingProxy } = buildFixture()
    settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(makerFeeRate, takerFeeRate))

    const setting = await application.getSetting()

    expect(setting.configured).toBe(false)
    expect(setting.summary).toBe('還沒設定')
  })
})

describe('TradeJournalSettingApplication.saveFeeRates', () => {
  it('把兩格讀成費率送出', async () => {
    const { application, settingProxy } = buildFixture()
    settingProxy.saveFeeRates.mockResolvedValue(new TradeJournalSetting(new Decimal('0.02'), new Decimal('0.05')))

    const setting = await application.saveFeeRates(' 0.02 ', '0.05')

    const [writeDto] = settingProxy.saveFeeRates.mock.calls[0] as [TradeFeeRatesWriteDto]
    expect(writeDto.makerFeeRate?.toString()).toBe('0.02')
    expect(writeDto.takerFeeRate?.toString()).toBe('0.05')
    expect(setting.summary).toBe('掛單 0.02%・吃單 0.05%')
  })

  it('留白就送沒有', async () => {
    const { application, settingProxy } = buildFixture()
    settingProxy.saveFeeRates.mockResolvedValue(new TradeJournalSetting(null, null))

    await application.saveFeeRates('', 'abc')

    const [writeDto] = settingProxy.saveFeeRates.mock.calls[0] as [TradeFeeRatesWriteDto]
    expect(writeDto.makerFeeRate).toBeNull()
    expect(writeDto.takerFeeRate).toBeNull()
  })
})

describe('TradeJournalSettingApplication.rateInputHint', () => {
  it.each([
    ['留白沒有提示', '', null],
    ['正常的費率沒有提示', '0.05', null],
    ['負的費率即時提示', '-0.01', '手續費率不得為負'],
    ['讀不懂的字即時提示', 'abc', '手續費率要填數字'],
  ])('%s', (_, rateText, expected) => {
    expect(buildFixture().application.rateInputHint(rateText)).toBe(expected)
  })
})

describe('TradeJournalSettingApplication 標籤', () => {
  it('依類別分組，失誤在前、型態在後', async () => {
    const { application, tagProxy } = buildFixture()
    tagProxy.listTags.mockResolvedValue([
      new TradeTag(1, 'mistake', '追價進場'),
      new TradeTag(2, 'mistake', '移動止損'),
      new TradeTag(3, 'mistake', '提早出場'),
      new TradeTag(4, 'mistake', '部位過大'),
      new TradeTag(5, 'mistake', '報復性交易'),
    ])

    const groups = await application.listTagGroups()

    expect(groups.map(group => group.title)).toEqual(['失誤標籤', '型態標籤'])
    expect(groups[0]?.tags.map(tag => tag.name)).toEqual(['追價進場', '移動止損', '提早出場', '部位過大', '報復性交易'])
    expect(groups[1]?.tags).toEqual([])
    expect(groups[1]?.emptyMessage).toContain('還沒有型態標籤')
  })

  it('新增與改名時去掉前後空白', async () => {
    const { application, tagProxy } = buildFixture()
    tagProxy.createTag.mockResolvedValue(new TradeTag(6, 'setup', '突破'))
    tagProxy.renameTag.mockResolvedValue(new TradeTag(2, 'mistake', '放寬止損'))

    const created = await application.createTag(new TradeTagWriteDto('setup', '  突破 '))
    const renamed = await application.renameTag(2, ' 放寬止損 ')

    expect(tagProxy.createTag).toHaveBeenCalledWith(expect.objectContaining({ kind: 'setup', name: '突破' }))
    expect(tagProxy.renameTag).toHaveBeenCalledWith(2, '放寬止損')
    expect(created.name).toBe('突破')
    expect(renamed.name).toBe('放寬止損')
  })

  it('刪除使用中的標籤時原話帶回', async () => {
    const { application, tagProxy } = buildFixture()
    const rejection = new TradeTagInUseError('還有 4 筆交易貼著它，請先從交易上移除或改名')
    tagProxy.deleteTag.mockRejectedValue(rejection)

    await expect(application.deleteTag(2)).rejects.toBe(rejection)
  })

  it('刪除沒在用的標籤', async () => {
    const { application, tagProxy } = buildFixture()
    tagProxy.deleteTag.mockResolvedValue(undefined)

    await application.deleteTag(5)

    expect(tagProxy.deleteTag).toHaveBeenCalledWith(5)
  })
})
