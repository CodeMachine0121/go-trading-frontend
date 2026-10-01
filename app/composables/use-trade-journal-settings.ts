import type { TradeJournalSettingDto } from '~/domain/models/dto/trade-journal-setting-dto'
import type { TradeTagGroupDto } from '~/domain/models/dto/trade-tag-group-dto'
import { TradeTagWriteDto } from '~/domain/models/dto/trade-tag-write-dto'
import type { TradeTagKind } from '~/domain/models/vo/trade-tag-kind-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export function useTradeJournalSettings(
  tradeJournalSettingApplication = useNuxtApp().$tradeJournalSettingApplication,
) {
  const setting = ref<TradeJournalSettingDto | null>(null)
  const loading = ref(false)
  const loadErrorMessage = ref<LocalizedTextVo | null>(null)

  const makerRateText = ref('')
  const takerRateText = ref('')
  const saving = ref(false)
  const saveErrorMessage = ref<LocalizedTextVo | null>(null)
  const makerRateHint = computed(() => tradeJournalSettingApplication.rateInputHint(makerRateText.value))
  const takerRateHint = computed(() => tradeJournalSettingApplication.rateInputHint(takerRateText.value))

  const tagGroups = ref<TradeTagGroupDto[]>([])
  const tagErrorMessage = ref<LocalizedTextVo | null>(null)
  const newTagKind = ref<TradeTagKind>('setup')
  const newTagName = ref('')
  const tagBusy = ref(false)

  async function loadSettings(): Promise<void> {
    loading.value = true
    loadErrorMessage.value = null

    try {
      const [loadedSetting, loadedTagGroups] = await Promise.all([
        tradeJournalSettingApplication.getSetting(),
        tradeJournalSettingApplication.listTagGroups(),
      ])
      setting.value = loadedSetting
      tagGroups.value = loadedTagGroups
      makerRateText.value = loadedSetting.makerFeeRate?.toString() ?? ''
      takerRateText.value = loadedSetting.takerFeeRate?.toString() ?? ''
    }
    catch (error: unknown) {
      loadErrorMessage.value = tradeJournalSettingApplication.describeFailure(error).message
    }
    finally {
      loading.value = false
    }
  }

  async function saveFeeRates(): Promise<void> {
    if (saving.value || makerRateHint.value !== null || takerRateHint.value !== null) {
      return
    }

    saving.value = true
    saveErrorMessage.value = null

    try {
      setting.value = await tradeJournalSettingApplication.saveFeeRates(makerRateText.value, takerRateText.value)
    }
    catch (error: unknown) {
      saveErrorMessage.value = tradeJournalSettingApplication.describeFailure(error).message
    }
    finally {
      saving.value = false
    }
  }

  async function runTagAction(action: () => Promise<unknown>): Promise<boolean> {
    if (tagBusy.value) {
      return false
    }

    tagBusy.value = true
    tagErrorMessage.value = null

    try {
      await action()
      tagGroups.value = await tradeJournalSettingApplication.listTagGroups()

      return true
    }
    catch (error: unknown) {
      tagErrorMessage.value = tradeJournalSettingApplication.describeFailure(error).message

      return false
    }
    finally {
      tagBusy.value = false
    }
  }

  async function createTag(): Promise<void> {
    if (newTagName.value.trim() === '') {
      return
    }

    const created = await runTagAction(() => tradeJournalSettingApplication.createTag(
      new TradeTagWriteDto(newTagKind.value, newTagName.value)))
    if (created) {
      newTagName.value = ''
    }
  }

  async function renameTag(id: number, name: string): Promise<void> {
    await runTagAction(() => tradeJournalSettingApplication.renameTag(id, name))
  }

  async function deleteTag(id: number): Promise<void> {
    await runTagAction(() => tradeJournalSettingApplication.deleteTag(id))
  }

  return {
    setting,
    loading,
    loadErrorMessage,
    makerRateText,
    takerRateText,
    makerRateHint,
    takerRateHint,
    saving,
    saveErrorMessage,
    tagGroups,
    tagErrorMessage,
    newTagKind,
    newTagName,
    tagBusy,
    loadSettings,
    saveFeeRates,
    createTag,
    renameTag,
    deleteTag,
  }
}
