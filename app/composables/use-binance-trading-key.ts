import type { BinanceTradingKeyDto } from '~/domain/models/dto/binance-trading-key-dto'
import { BinanceTradingKeyWriteDto } from '~/domain/models/dto/binance-trading-key-write-dto'
import { BinanceTradingKeyFieldError } from '~/domain/errors/binance-trading-key-field-error'
import { BinanceTradingKeyVerificationError } from '~/domain/errors/binance-trading-key-verification-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

export function useBinanceTradingKey(
  binanceTradingKeyApplication = useNuxtApp().$binanceTradingKeyApplication,
) {
  const { translatedText } = useLocalizedText()
  const setting = ref<BinanceTradingKeyDto | null>(null)
  const loading = ref(false)
  const loadErrorMessage = ref<LocalizedTextVo | null>(null)

  const apiKey = ref('')
  const secretKey = ref('')
  const editing = ref(false)
  const saving = ref(false)
  const saveErrorMessage = ref<LocalizedTextVo | null>(null)
  const apiKeyError = ref<LocalizedTextVo | null>(null)
  const secretKeyError = ref<LocalizedTextVo | null>(null)

  const configured = computed(() => setting.value?.configured ?? false)
  const formVisible = computed(() => !configured.value || editing.value)

  function clearForm(): void {
    apiKey.value = ''
    secretKey.value = ''
    saveErrorMessage.value = null
    apiKeyError.value = null
    secretKeyError.value = null
  }

  function startEditing(): void {
    clearForm()
    editing.value = true
  }

  function cancelEditing(): void {
    clearForm()
    editing.value = false
  }

  async function loadTradingKey(): Promise<void> {
    loading.value = true
    loadErrorMessage.value = null

    try {
      setting.value = await binanceTradingKeyApplication.loadTradingKey()
    }
    catch (error: unknown) {
      setting.value = null
      loadErrorMessage.value = messageFor(error)
    }
    finally {
      loading.value = false
    }
  }

  async function saveTradingKey(): Promise<void> {
    if (saving.value) {
      return
    }

    saving.value = true
    saveErrorMessage.value = null
    apiKeyError.value = null
    secretKeyError.value = null

    try {
      setting.value = await binanceTradingKeyApplication.saveTradingKey(
        new BinanceTradingKeyWriteDto(apiKey.value, secretKey.value))
      clearForm()
      editing.value = false
    }
    catch (error: unknown) {
      if (error instanceof BinanceTradingKeyFieldError && error.field === 'apiKey') {
        apiKeyError.value = error.localizedMessage
      }
      else if (error instanceof BinanceTradingKeyFieldError && error.field === 'secretKey') {
        secretKeyError.value = error.localizedMessage
      }
      else {
        saveErrorMessage.value = messageFor(error)
      }
    }
    finally {
      saving.value = false
    }
  }

  async function removeTradingKey(): Promise<void> {
    if (saving.value) {
      return
    }

    saving.value = true
    saveErrorMessage.value = null

    try {
      await binanceTradingKeyApplication.removeTradingKey()
      setting.value = await binanceTradingKeyApplication.loadTradingKey()
      clearForm()
      editing.value = false
    }
    catch (error: unknown) {
      saveErrorMessage.value = messageFor(error)
    }
    finally {
      saving.value = false
    }
  }

  function messageFor(error: unknown): LocalizedTextVo {
    if (error instanceof SecretSealUnavailableError) {
      return translatedText('settings.binanceTradingKey.secretSealUnavailable', { message: error.message })
    }

    if (error instanceof BinanceTradingKeyVerificationError
      || error instanceof BinanceTradingKeyFieldError
      || error instanceof BackendRequestRejectedError) {
      return error.localizedMessage
    }

    if (error instanceof BackendUnreachableError) {
      return error.localizedMessage
    }

    return translatedText('settings.binanceTradingKey.unexpectedError')
  }

  return {
    setting,
    configured,
    loading,
    loadErrorMessage,
    apiKey,
    secretKey,
    editing,
    formVisible,
    saving,
    saveErrorMessage,
    apiKeyError,
    secretKeyError,
    startEditing,
    cancelEditing,
    loadTradingKey,
    saveTradingKey,
    removeTradingKey,
  }
}
