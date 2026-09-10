import type { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import { TestMessageDomain } from '~/domain/models/domains/test-message-domain'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/** 輸入框裡預先填好的那一句。預填是為了讓「按一下就知道通不通」真的只要按一下。 */
export const DEFAULT_TEST_MESSAGE = '這是一則來自 go-trading 的測試訊息。'

/**
 * 設定畫面上「Telegram 投遞」那一張卡的狀態與編排。
 *
 * 它的狀態不與另外兩張卡共用（見 usePasswordChange 的同一段理由）。
 */
export function useTelegramDelivery(
  telegramDeliveryApplication = useNuxtApp().$telegramDeliveryApplication,
) {
  const setting = ref<TelegramDeliveryDto | null>(null)
  /**
   * 正在讀第一次。它與 `null` 的設定分開，因為兩者在畫面上長得完全不同：
   * 讀取中要說「讀取中」，讀完了才說得出「還沒有設定」。反過來的話，
   * 已經設定過的人會在每次進來的頭半秒被告知他沒有設定。
   */
  const loading = ref(false)
  const loadErrorMessage = ref<string | null>(null)

  const botToken = ref('')
  const chatId = ref('')
  const saving = ref(false)
  const saveErrorMessage = ref<string | null>(null)

  const message = ref(DEFAULT_TEST_MESSAGE)
  const sending = ref(false)
  const sendResultMessage = ref<string | null>(null)
  const sendSucceeded = ref(false)

  const configured = computed(() => setting.value?.configured ?? false)

  /** 這一則訊息現在的樣子：幾個字、上限幾個字、送不送得出去。規則在領域裡。 */
  const testMessage = computed(() => new TestMessageDomain(message.value))
  const messageError = computed(() => testMessage.value.error())
  const characterCount = computed(() => testMessage.value.characterCount())
  const maximumCharacterCount = computed(() => testMessage.value.maximumCharacterCount())
  const canSendTestMessage = computed(
    () => configured.value && messageError.value === null && !sending.value)

  /** 進畫面時讀一次目前的設定。 */
  async function loadDeliverySetting(): Promise<void> {
    loading.value = true
    loadErrorMessage.value = null

    try {
      setting.value = await telegramDeliveryApplication.loadDeliverySetting()
    }
    catch (error: unknown) {
      // 讀不到不等於沒設定過。把它畫成空狀態，已經設定過的人會以為自己的設定不見了。
      setting.value = null
      loadErrorMessage.value = messageFor(error)
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 存下兩格。成功之後**清空金鑰那一格**——它已經拿不回來了，
   * 留半串在畫面上只會讓人以為它還在。
   */
  async function saveDeliverySetting(): Promise<void> {
    if (saving.value) {
      return
    }

    saving.value = true
    saveErrorMessage.value = null
    sendResultMessage.value = null

    try {
      setting.value = await telegramDeliveryApplication.saveDeliverySetting(
        botToken.value, chatId.value)
      botToken.value = ''
    }
    catch (error: unknown) {
      saveErrorMessage.value = messageFor(error)
    }
    finally {
      saving.value = false
    }
  }

  /** 整份移除。呼叫端負責先問過一次。 */
  async function removeDeliverySetting(): Promise<void> {
    if (saving.value) {
      return
    }

    saving.value = true
    saveErrorMessage.value = null
    sendResultMessage.value = null

    try {
      await telegramDeliveryApplication.removeDeliverySetting()
      setting.value = await telegramDeliveryApplication.loadDeliverySetting()
      botToken.value = ''
    }
    catch (error: unknown) {
      saveErrorMessage.value = messageFor(error)
    }
    finally {
      saving.value = false
    }
  }

  /**
   * 送一則測試訊息。
   *
   * 送不出去仍然是一次成功的詢問，所以它的答案落在 sendResultMessage 而不是
   * 某個錯誤狀態——這顆鍵存在的意義就是問到那個答案。
   */
  async function sendTestMessage(): Promise<void> {
    if (!canSendTestMessage.value) {
      return
    }

    sending.value = true
    sendResultMessage.value = null
    sendSucceeded.value = false

    try {
      const result = await telegramDeliveryApplication.sendTestMessage(message.value)
      sendSucceeded.value = result.delivered
      sendResultMessage.value = result.delivered
        ? '送出成功，去 Telegram 看看那則訊息。'
        : result.failureSentence
    }
    catch (error: unknown) {
      sendResultMessage.value = messageFor(error)
    }
    finally {
      sending.value = false
    }
  }

  return {
    setting,
    configured,
    loading,
    loadErrorMessage,
    botToken,
    chatId,
    saving,
    saveErrorMessage,
    message,
    messageError,
    characterCount,
    maximumCharacterCount,
    sending,
    canSendTestMessage,
    sendResultMessage,
    sendSucceeded,
    loadDeliverySetting,
    saveDeliverySetting,
    removeDeliverySetting,
    sendTestMessage,
  }
}

/**
 * 哨兵錯誤分流。三種失敗要使用者做的事完全不同，所以說法也不同：
 * 後端存不了金鑰是什麼都不必改、還沒設定過是去上面那張卡設定一次、
 * 連不上後端是去把它啟動。
 */
function messageFor(error: unknown): string {
  if (error instanceof SecretSealUnavailableError) {
    return `${error.message}（後端尚未設定 SECRET_SEAL_KEY，這不是你填錯了什麼。）`
  }

  if (error instanceof TelegramNotConfiguredError) {
    return '請先在上面完成 Telegram 設定，再送測試訊息。'
  }

  if (error instanceof BackendRequestRejectedError) {
    return error.message
  }

  if (error instanceof BackendUnreachableError) {
    return '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
  }

  return '與 Telegram 設定往來時發生未預期的錯誤。'
}
