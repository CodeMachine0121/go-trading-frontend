import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { StrategyScriptDto } from '~/domain/models/dto/strategy-script-dto'
import type { SymbolScreeningProfileDto } from '~/domain/models/dto/symbol-screening-profile-dto'
import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'
import { useSymbolScreeningFailureMessage } from '~/composables/use-symbol-screening-failure-message'

export function useSymbolScreeningProfiles(symbolScreeningApplication: SymbolScreeningApplication) {
  const { failureMessageOf } = useSymbolScreeningFailureMessage()

  const profiles = ref<SymbolScreeningProfileDto[]>([])
  const screenableStrategyScripts = ref<StrategyScriptDto[]>([])
  const loading = ref(false)
  const failureMessage = ref<LocalizedTextVo | null>(null)
  const saving = ref(false)
  const saveFailureMessage = ref<LocalizedTextVo | null>(null)

  async function load() {
    loading.value = true
    failureMessage.value = null

    try {
      const [loadedProfiles, loadedStrategyScripts] = await Promise.all([
        symbolScreeningApplication.listProfiles(),
        symbolScreeningApplication.listScreenableStrategyScripts(),
      ])
      profiles.value = loadedProfiles
      screenableStrategyScripts.value = loadedStrategyScripts
    }
    catch (error: unknown) {
      failureMessage.value = failureMessageOf(error)
    }
    finally {
      loading.value = false
    }
  }

  async function save(writeDto: SymbolScreeningProfileWriteDto): Promise<boolean> {
    saving.value = true
    saveFailureMessage.value = null

    try {
      const saved = await symbolScreeningApplication.saveProfile(writeDto)
      profiles.value = profiles.value.some(profile => profile.id === saved.id)
        ? profiles.value.map(profile => (profile.id === saved.id ? saved : profile))
        : [...profiles.value, saved]

      return true
    }
    catch (error: unknown) {
      saveFailureMessage.value = failureMessageOf(error)

      return false
    }
    finally {
      saving.value = false
    }
  }

  async function remove(id: number) {
    failureMessage.value = null

    try {
      await symbolScreeningApplication.deleteProfile(id)
      profiles.value = profiles.value.filter(profile => profile.id !== id)
    }
    catch (error: unknown) {
      failureMessage.value = failureMessageOf(error)
    }
  }

  function clearSaveFailure() {
    saveFailureMessage.value = null
  }

  return {
    profiles,
    screenableStrategyScripts,
    loading,
    failureMessage,
    saving,
    saveFailureMessage,
    load,
    save,
    remove,
    clearSaveFailure,
  }
}
