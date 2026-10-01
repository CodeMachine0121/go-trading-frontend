// @vitest-environment nuxt
import Decimal from 'decimal.js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TradeJournalSettingApplication } from '~/application/trade-journal-setting-application'
import { TradeJournalSettingService } from '~/domain/service/trade-journal-setting-service'
import type { ITradeJournalSettingProxy } from '~/domain/interface/i-trade-journal-setting-proxy'
import type { ITradeTagProxy } from '~/domain/interface/i-trade-tag-proxy'
import { TradeJournalSetting } from '~/domain/models/entities/trade-journal-setting'
import { TradeTag } from '~/domain/models/entities/trade-tag'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendServerError } from '~/domain/errors/backend-server-error'
import { TradeTagInUseError } from '~/domain/errors/trade-tag-in-use-error'
import { TradeTagNameConflictError } from '~/domain/errors/trade-tag-name-conflict-error'

const settingProxy = { findSetting: vi.fn(), saveFeeRates: vi.fn() }
const tagProxy = { listTags: vi.fn(), createTag: vi.fn(), renameTag: vi.fn(), deleteTag: vi.fn() }

function settingsUnderTest() {
  return useTradeJournalSettings(new TradeJournalSettingApplication(new TradeJournalSettingService(
    settingProxy as unknown as ITradeJournalSettingProxy, tagProxy as unknown as ITradeTagProxy)))
}

beforeEach(() => {
  vi.clearAllMocks()
  settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(null, null))
  tagProxy.listTags.mockResolvedValue([new TradeTag(2, 'mistake', '移動止損')])
})

describe('useTradeJournalSettings：讀取', () => {
  it('還沒設定時寫還沒設定，兩格是空的', async () => {
    const { loadSettings, setting, makerRateText, tagGroups, loading } = settingsUnderTest()

    await loadSettings()

    expect(setting.value?.summary.in('zh-TW')).toBe('還沒設定')
    expect(makerRateText.value).toBe('')
    expect(tagGroups.value[0]?.tags.map(tag => tag.name)).toEqual(['移動止損'])
    expect(loading.value).toBe(false)
  })

  it('設定過的費率填回兩格', async () => {
    settingProxy.findSetting.mockResolvedValue(new TradeJournalSetting(new Decimal('0.02'), new Decimal('0.05')))
    const { loadSettings, makerRateText, takerRateText } = settingsUnderTest()

    await loadSettings()

    expect(makerRateText.value).toBe('0.02')
    expect(takerRateText.value).toBe('0.05')
  })

  it('連不上時說連不上', async () => {
    settingProxy.findSetting.mockRejectedValue(new BackendUnreachableError('http://x'))
    const { loadSettings, loadErrorMessage } = settingsUnderTest()

    await loadSettings()

    expect(loadErrorMessage.value?.in('zh-TW')).toContain('連不上交易服務')
  })
})

describe('useTradeJournalSettings：手續費率', () => {
  it('負的費率即時提示，而且不送出', async () => {
    const { makerRateText, makerRateHint, saveFeeRates } = settingsUnderTest()
    makerRateText.value = '-0.01'

    await saveFeeRates()

    expect(makerRateHint.value?.in('zh-TW')).toBe('手續費率不得為負')
    expect(settingProxy.saveFeeRates).not.toHaveBeenCalled()
  })

  it('吃單費率讀不懂時也不送出', async () => {
    const { takerRateText, takerRateHint, saveFeeRates } = settingsUnderTest()
    takerRateText.value = 'abc'

    await saveFeeRates()

    expect(takerRateHint.value?.in('zh-TW')).toBe('手續費率要填數字')
    expect(settingProxy.saveFeeRates).not.toHaveBeenCalled()
  })

  it('存好後呈現新的費率', async () => {
    settingProxy.saveFeeRates.mockResolvedValue(new TradeJournalSetting(new Decimal('0.02'), new Decimal('0.05')))
    const { makerRateText, takerRateText, saveFeeRates, setting, saving } = settingsUnderTest()
    makerRateText.value = '0.02'
    takerRateText.value = '0.05'

    await saveFeeRates()

    expect(setting.value?.summary.in('zh-TW')).toBe('掛單 0.02%・吃單 0.05%')
    expect(saving.value).toBe(false)
  })

  it('儲存中再按一次不會送兩次', async () => {
    settingProxy.saveFeeRates.mockReturnValue(new Promise(() => {}))
    const { saveFeeRates } = settingsUnderTest()

    void saveFeeRates()
    await saveFeeRates()

    expect(settingProxy.saveFeeRates).toHaveBeenCalledTimes(1)
  })

  it('後端壞了說稍後再試', async () => {
    settingProxy.saveFeeRates.mockRejectedValue(new BackendServerError('boom'))
    const { saveFeeRates, saveErrorMessage } = settingsUnderTest()

    await saveFeeRates()

    expect(saveErrorMessage.value?.in('zh-TW')).toBe('交易服務暫時出了問題，請稍後再試。')
  })
})

describe('useTradeJournalSettings：標籤', () => {
  it('新增後清空輸入並重讀清單', async () => {
    tagProxy.createTag.mockResolvedValue(new TradeTag(6, 'setup', '突破'))
    const { newTagName, newTagKind, createTag } = settingsUnderTest()
    newTagKind.value = 'setup'
    newTagName.value = '突破'

    await createTag()

    expect(tagProxy.createTag).toHaveBeenCalledWith(expect.objectContaining({ kind: 'setup', name: '突破' }))
    expect(newTagName.value).toBe('')
    expect(tagProxy.listTags).toHaveBeenCalled()
  })

  it('名稱空白時不送出', async () => {
    const { newTagName, createTag } = settingsUnderTest()
    newTagName.value = '  '

    await createTag()

    expect(tagProxy.createTag).not.toHaveBeenCalled()
  })

  it('重名時原話呈現，輸入保留', async () => {
    tagProxy.createTag.mockRejectedValue(new TradeTagNameConflictError('已有同名的型態標籤'))
    const { newTagName, createTag, tagErrorMessage } = settingsUnderTest()
    newTagName.value = '突破'

    await createTag()

    expect(tagErrorMessage.value?.in('zh-TW')).toBe('已有同名的型態標籤')
    expect(newTagName.value).toBe('突破')
  })

  it('改名後重讀清單', async () => {
    tagProxy.renameTag.mockResolvedValue(new TradeTag(2, 'mistake', '放寬止損'))
    tagProxy.listTags.mockResolvedValue([new TradeTag(2, 'mistake', '放寬止損')])
    const { renameTag, tagGroups } = settingsUnderTest()

    await renameTag(2, '放寬止損')

    expect(tagGroups.value[0]?.tags[0]?.name).toBe('放寬止損')
  })

  it('刪除使用中的標籤時原話呈現', async () => {
    tagProxy.deleteTag.mockRejectedValue(new TradeTagInUseError('還有 4 筆交易貼著它，請先從交易上移除或改名'))
    const { deleteTag, tagErrorMessage } = settingsUnderTest()

    await deleteTag(2)

    expect(tagErrorMessage.value?.in('zh-TW')).toBe('還有 4 筆交易貼著它，請先從交易上移除或改名')
  })

  it('一個標籤動作進行中時不接受下一個', async () => {
    tagProxy.deleteTag.mockReturnValue(new Promise(() => {}))
    const { deleteTag, renameTag } = settingsUnderTest()

    void deleteTag(2)
    await renameTag(2, 'x')

    expect(tagProxy.renameTag).not.toHaveBeenCalled()
  })

  it('未預期的錯誤說未預期', async () => {
    tagProxy.deleteTag.mockRejectedValue(new Error('weird'))
    const { deleteTag, tagErrorMessage } = settingsUnderTest()

    await deleteTag(2)

    expect(tagErrorMessage.value?.in('zh-TW')).toBe('與交易日誌往來時發生未預期的錯誤。')
    expect(tagErrorMessage.value?.in('en')).toBe('An unexpected error occurred while talking to the trade journal.')
  })
})
