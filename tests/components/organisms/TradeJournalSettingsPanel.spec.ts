import Decimal from 'decimal.js'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it } from 'vitest'
import TradeJournalSettingsPanel from '~/components/organisms/TradeJournalSettingsPanel.vue'
import { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import { TradeTagDto } from '~/domain/models/dto/trade-tag-dto'
import { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { UntranslatedTextVo } from '~/domain/models/vo/untranslated-text-vo'

const GROUPS = [
  new TradeTagGroupDto(
    'mistake',
    new LocalizedTextVo('失誤標籤', 'Mistake tags'),
    [new TradeTagDto(2, 'mistake', '移動止損')],
    new LocalizedTextVo('還沒有失誤標籤', 'No mistake tags yet')),
  new TradeTagGroupDto(
    'setup',
    new LocalizedTextVo('型態標籤', 'Setup tags'),
    [],
    new LocalizedTextVo('還沒有型態標籤，可以在交易上就地新增', 'No setup tags yet—you can add them right on a trade')),
]

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(TradeJournalSettingsPanel, {
    props: {
      makerRateText: '',
      takerRateText: '',
      newTagKind: 'setup',
      newTagName: '',
      setting: new TradeJournalSettingDto(null, null, false, new LocalizedTextVo('還沒設定', 'Not set yet')),
      tagGroups: GROUPS,
      ...props,
    },
  })
}

describe('TradeJournalSettingsPanel', () => {
  it('還沒設定手續費率時寫還沒設定，是正常狀態不是錯誤', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="fee-rate-summary"]').text()).toBe('還沒設定')
    expect(wrapper.find('[data-testid="trade-journal-settings-load-error"]').exists()).toBe(false)
  })

  it('設定過時呈現兩個費率', () => {
    const wrapper = mountPanel({ setting: new TradeJournalSettingDto(new Decimal('0.02'), new Decimal('0.05'), true, new UntranslatedTextVo('掛單 0.02%・吃單 0.05%')) })

    expect(wrapper.get('[data-testid="fee-rate-summary"]').text()).toBe('掛單 0.02%・吃單 0.05%')
  })

  it('費率有提示時儲存鍵按不動', () => {
    const wrapper = mountPanel({ makerRateHint: new LocalizedTextVo('手續費率不得為負', 'Fee rate cannot be negative') })

    expect(wrapper.get('[data-testid="fee-rate-save"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('手續費率不得為負')
  })

  it('按儲存送出', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="fee-rate-save"]').trigger('click')

    expect(wrapper.emitted('saveFeeRates')).toHaveLength(1)
  })

  it('讀取中與讀取失敗各有自己的樣子', () => {
    expect(mountPanel({ loading: true }).find('[data-testid="trade-journal-settings-loading"]').exists()).toBe(true)
    expect(mountPanel({ loadErrorMessage: new UntranslatedTextVo('連不上') }).get('[data-testid="trade-journal-settings-load-error"]').text()).toBe('連不上')
  })

  it('改名：按改名、改字、確認後送出新的名字', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="tag-rename"]').trigger('click')
    await wrapper.get('[data-testid="tag-rename-input"]').setValue('放寬止損')
    await wrapper.get('[data-testid="tag-rename-confirm"]').trigger('click')

    expect(wrapper.emitted('renameTag')).toEqual([[2, '放寬止損']])
    expect(wrapper.find('[data-testid="tag-rename-input"]').exists()).toBe(false)
  })

  it('改名時清成空白就不送出；取消就收起來', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="tag-rename"]').trigger('click')
    await wrapper.get('[data-testid="tag-rename-input"]').setValue('  ')
    await wrapper.get('[data-testid="tag-rename-input"]').trigger('keydown.enter')
    await wrapper.get('[data-testid="tag-rename"]').trigger('click')
    await wrapper.get('[data-testid="tag-rename-cancel"]').trigger('click')

    expect(wrapper.emitted('renameTag')).toBeUndefined()
    expect(wrapper.find('[data-testid="tag-rename-input"]').exists()).toBe(false)
  })

  it('刪除與新增標籤', async () => {
    const wrapper = mountPanel({ newTagName: '突破' })

    await wrapper.get('[data-testid="tag-delete"]').trigger('click')
    await wrapper.get('[data-testid="new-tag-create"]').trigger('click')
    await wrapper.get('[data-testid="new-tag-name"]').trigger('keydown.enter')

    expect(wrapper.emitted('deleteTag')).toEqual([[2]])
    expect(wrapper.emitted('createTag')).toHaveLength(2)
  })

  it('沒有型態標籤時說可以就地新增；標籤錯誤呈現', () => {
    const wrapper = mountPanel({ tagErrorMessage: new UntranslatedTextVo('已有同名的型態標籤') })

    expect(wrapper.get('[data-testid="tag-group-setup"]').text()).toContain('還沒有型態標籤')
    expect(wrapper.get('[data-testid="tag-error"]').text()).toBe('已有同名的型態標籤')
  })
})

describe('TradeJournalSettingsPanel 輸入', () => {
  it('四格輸入都往上同步', async () => {
    const wrapper = mountPanel()

    await wrapper.get('[data-testid="maker-fee-rate-input"]').setValue('0.02')
    await wrapper.get('[data-testid="taker-fee-rate-input"]').setValue('0.05')
    await wrapper.get('[data-testid="new-tag-kind"]').setValue('mistake')
    await wrapper.get('[data-testid="new-tag-name"]').setValue('追價進場')

    expect(wrapper.emitted('update:makerRateText')).toEqual([['0.02']])
    expect(wrapper.emitted('update:takerRateText')).toEqual([['0.05']])
    expect(wrapper.emitted('update:newTagKind')).toEqual([['mistake']])
    expect(wrapper.emitted('update:newTagName')).toEqual([['追價進場']])
  })

  it('儲存中時儲存鍵寫儲存中', () => {
    expect(mountPanel({ saving: true, saveErrorMessage: new UntranslatedTextVo('存不進去') }).text()).toContain('儲存中')
  })
})

describe('TradeJournalSettingsPanel 英文', () => {
  it('換成英文時標題、標籤群組與提示都跟著換', async () => {
    const wrapper = mountPanel({ makerRateHint: new LocalizedTextVo('手續費率不得為負', 'Fee rate cannot be negative') })

    wrapper.vm.$i18n.locale = 'en'
    await nextTick()

    expect(wrapper.text()).toContain('Fee rate cannot be negative')
    expect(wrapper.get('[data-testid="fee-rate-summary"]').text()).toBe('Not set yet')
    expect(wrapper.get('[data-testid="tag-group-setup"]').text()).toContain('No setup tags yet')
    expect(wrapper.get('[data-testid="fee-rate-save"]').text()).toBe('Save fee rates')
  })
})

describe('TradeJournalSettingsPanel 還沒讀到設定', () => {
  it('當作還沒設定', () => {
    expect(mountPanel({ setting: null }).get('[data-testid="fee-rate-summary"]').text()).toBe('還沒設定')
  })
})
