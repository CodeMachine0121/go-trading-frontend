// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TelegramDeliveryDto } from '~/domain/models/dto/telegram-delivery-dto'
import { TestMessageResultDto } from '~/domain/models/dto/test-message-result-dto'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'
import { SecretSealUnavailableError } from '~/domain/errors/secret-seal-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'

const CONFIGURED = new TelegramDeliveryDto(
  true, '987654', '1234', '已設定，結尾 1234；要更換請重新填入整串金鑰。')
const UNCONFIGURED = new TelegramDeliveryDto(false, '', '', null)

const telegramDeliveryApplication = {
  loadDeliverySetting: vi.fn(),
  saveDeliverySetting: vi.fn(),
  removeDeliverySetting: vi.fn(),
  sendTestMessage: vi.fn(),
}

function telegramDeliveryUnderTest() {
  return useTelegramDelivery(
    telegramDeliveryApplication as unknown as Parameters<typeof useTelegramDelivery>[0])
}

beforeEach(() => {
  vi.clearAllMocks()
  telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(UNCONFIGURED)
  telegramDeliveryApplication.saveDeliverySetting.mockResolvedValue(CONFIGURED)
  telegramDeliveryApplication.removeDeliverySetting.mockResolvedValue(undefined)
  telegramDeliveryApplication.sendTestMessage.mockResolvedValue(
    new TestMessageResultDto(true, null))
})

describe('useTelegramDelivery：讀回目前的設定', () => {
  it('讀到什麼就顯示什麼', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const { loadDeliverySetting, setting, configured } = telegramDeliveryUnderTest()

    await loadDeliverySetting()

    expect(configured.value).toBe(true)
    expect(setting.value?.chatId).toBe('987654')
  })

  it('讀不到時不把它畫成「還沒設定」', async () => {
    // 已經設定過的人會以為自己的設定不見了。
    telegramDeliveryApplication.loadDeliverySetting.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080/users/me/telegram-delivery'))
    const { loadDeliverySetting, loadErrorMessage } = telegramDeliveryUnderTest()

    await loadDeliverySetting()

    expect(loadErrorMessage.value).toContain('連不上後端 go-trading API')
  })
})

describe('useTelegramDelivery：儲存與移除', () => {
  it('存好之後金鑰那一格清空', async () => {
    // 它已經拿不回來了，留半串在畫面上只會讓人以為它還在。
    const { botToken, chatId, saveDeliverySetting, setting } = telegramDeliveryUnderTest()
    botToken.value = '123456:AAH'
    chatId.value = '987654'

    await saveDeliverySetting()

    expect(botToken.value).toBe('')
    expect(setting.value?.botTokenTail).toBe('1234')
  })

  it('後端存不了金鑰時明說這不是使用者填錯了什麼', async () => {
    telegramDeliveryApplication.saveDeliverySetting.mockRejectedValue(
      new SecretSealUnavailableError('系統目前無法安全保存機器人金鑰'))
    const { saveDeliverySetting, saveErrorMessage } = telegramDeliveryUnderTest()

    await saveDeliverySetting()

    expect(saveErrorMessage.value).toContain('SECRET_SEAL_KEY')
    expect(saveErrorMessage.value).toContain('不是你填錯了什麼')
  })

  it('移除之後回到「還沒設定」的樣子', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(UNCONFIGURED)
    const { removeDeliverySetting, configured } = telegramDeliveryUnderTest()

    await removeDeliverySetting()

    expect(telegramDeliveryApplication.removeDeliverySetting).toHaveBeenCalledOnce()
    expect(configured.value).toBe(false)
  })
})

describe('useTelegramDelivery：試送一則訊息', () => {
  it('一開始就填好一句可以直接送的話', () => {
    expect(telegramDeliveryUnderTest().message.value).toBe('這是一則來自 go-trading 的測試訊息。')
  })

  it('還沒設定過就送不了', async () => {
    const { canSendTestMessage, sendTestMessage } = telegramDeliveryUnderTest()

    expect(canSendTestMessage.value).toBe(false)
    await sendTestMessage()
    expect(telegramDeliveryApplication.sendTestMessage).not.toHaveBeenCalled()
  })

  it('設定好之後就送得了，而且送成功說成功', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    expect(fixture.canSendTestMessage.value).toBe(true)
    await fixture.sendTestMessage()

    expect(fixture.sendSucceeded.value).toBe(true)
    expect(fixture.sendResultMessage.value).toContain('送出成功')
  })

  it('送不成時把領域備好的那一句原樣說出來', async () => {
    // 這顆鍵的全部價值就在於它會說出是哪一格填錯。
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    telegramDeliveryApplication.sendTestMessage.mockResolvedValue(
      new TestMessageResultDto(false, 'Telegram 送不到這個聊天室。確認聊天室代號，並確認你已經在 Telegram 對這個 bot 按過 Start——它不能主動私訊沒找過它的人。'))
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    await fixture.sendTestMessage()

    expect(fixture.sendSucceeded.value).toBe(false)
    expect(fixture.sendResultMessage.value).toBe('Telegram 送不到這個聊天室。確認聊天室代號，並確認你已經在 Telegram 對這個 bot 按過 Start——它不能主動私訊沒找過它的人。')
  })

  it('後端說還沒設定過時，把人指向上面那張卡', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    telegramDeliveryApplication.sendTestMessage.mockRejectedValue(
      new TelegramNotConfiguredError('尚未完成 Telegram 設定'))
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    await fixture.sendTestMessage()

    expect(fixture.sendResultMessage.value).toContain('請先在上面完成 Telegram 設定')
  })

  it.each([
    ['空白的訊息', '   ', '訊息不得為空白'],
    ['超過上限的訊息', '字'.repeat(4097), '一則訊息上限為 4096 個字元，目前有 4097 個'],
  ])('%s在畫面上就擋下來，不必跑一趟後端', async (_situation, message, expectedError) => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()
    fixture.message.value = message

    expect(fixture.messageError.value).toBe(expectedError)
    expect(fixture.canSendTestMessage.value).toBe(false)

    await fixture.sendTestMessage()
    expect(telegramDeliveryApplication.sendTestMessage).not.toHaveBeenCalled()
  })

  it('隨時說得出現在有幾個字、上限幾個字', () => {
    const fixture = telegramDeliveryUnderTest()
    fixture.message.value = '  哈囉  '

    expect(fixture.characterCount.value).toBe(2)
    expect(fixture.maximumCharacterCount.value).toBe(4096)
  })

  it('送出中不送第二則', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    let releaseSend = (): void => {}
    telegramDeliveryApplication.sendTestMessage.mockReturnValue(
      new Promise<TestMessageResultDto>((resolve) => {
        releaseSend = () => resolve(new TestMessageResultDto(true, null))
      }))
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    const firstSend = fixture.sendTestMessage()
    expect(fixture.canSendTestMessage.value).toBe(false)
    await fixture.sendTestMessage()

    expect(telegramDeliveryApplication.sendTestMessage).toHaveBeenCalledTimes(1)

    releaseSend()
    await firstSend
  })
})

describe('useTelegramDelivery：一次只做一件事，而且失敗說得出口', () => {
  it('儲存進行中不再送第二次', async () => {
    let releaseSave = (): void => {}
    telegramDeliveryApplication.saveDeliverySetting.mockReturnValue(
      new Promise<TelegramDeliveryDto>((resolve) => {
        releaseSave = () => resolve(CONFIGURED)
      }))
    const fixture = telegramDeliveryUnderTest()

    const firstSave = fixture.saveDeliverySetting()
    await fixture.saveDeliverySetting()

    expect(telegramDeliveryApplication.saveDeliverySetting).toHaveBeenCalledTimes(1)

    releaseSave()
    await firstSave
  })

  it('移除進行中不再送第二次', async () => {
    let releaseRemove = (): void => {}
    telegramDeliveryApplication.removeDeliverySetting.mockReturnValue(
      new Promise<void>((resolve) => { releaseRemove = resolve }))
    const fixture = telegramDeliveryUnderTest()

    const firstRemoval = fixture.removeDeliverySetting()
    await fixture.removeDeliverySetting()

    expect(telegramDeliveryApplication.removeDeliverySetting).toHaveBeenCalledTimes(1)

    releaseRemove()
    await firstRemoval
  })

  it('移除失敗時說出來，而不是靜靜地看起來成功了', async () => {
    telegramDeliveryApplication.removeDeliverySetting.mockRejectedValue(
      new BackendUnreachableError('http://localhost:8080/users/me/telegram-delivery'))
    const { removeDeliverySetting, saveErrorMessage } = telegramDeliveryUnderTest()

    await removeDeliverySetting()

    expect(saveErrorMessage.value).toContain('連不上後端 go-trading API')
  })

  it('後端以業務規則拒絕時原樣轉述它那句話', async () => {
    telegramDeliveryApplication.saveDeliverySetting.mockRejectedValue(
      new BackendRequestRejectedError('必須給一組機器人金鑰', { status: 400 }))
    const { saveDeliverySetting, saveErrorMessage } = telegramDeliveryUnderTest()

    await saveDeliverySetting()

    expect(saveErrorMessage.value).toBe('必須給一組機器人金鑰')
  })

  it('沒見過的失敗也說得出一句話，不是一片空白', async () => {
    telegramDeliveryApplication.saveDeliverySetting.mockRejectedValue(new Error('something new'))
    const { saveDeliverySetting, saveErrorMessage } = telegramDeliveryUnderTest()

    await saveDeliverySetting()

    expect(saveErrorMessage.value).toBe('與 Telegram 設定往來時發生未預期的錯誤。')
  })
})

describe('useTelegramDelivery：那兩格什麼時候攤開', () => {
  it('還沒設定過就直接攤開——它們本來就得填', () => {
    const { formVisible, editing } = telegramDeliveryUnderTest()

    expect(formVisible.value).toBe(true)
    expect(editing.value).toBe(false)
  })

  it('已經連上就收起來，按了「更換」才攤開', async () => {
    // 金鑰拿不回來，所以一個永遠空著的密碼框擺在「已連線」底下，
    // 看起來像設定掉了。
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    expect(fixture.formVisible.value).toBe(false)

    fixture.startEditing()

    expect(fixture.formVisible.value).toBe(true)
    expect(fixture.editing.value).toBe(true)
  })

  it('讀回來時聊天室代號就填好了，金鑰不填', async () => {
    // 要換的人多半只換金鑰，讓他把一個系統本來就知道的數字再打一次是白費工；
    // 而金鑰是真的拿不回來。
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()

    await fixture.loadDeliverySetting()

    expect(fixture.chatId.value).toBe('987654')
    expect(fixture.botToken.value).toBe('')
  })

  it('取消就把填到一半的金鑰收掉，聊天室代號回到存著的那一個', async () => {
    // 留著半串來歷不明的字，下一次打開會看到它，而沒有人記得那是什麼。
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()
    fixture.startEditing()
    fixture.botToken.value = '打到一半'
    fixture.chatId.value = '改到一半'

    fixture.cancelEditing()

    expect(fixture.formVisible.value).toBe(false)
    expect(fixture.botToken.value).toBe('')
    expect(fixture.chatId.value).toBe('987654')
  })

  it('換成功之後那兩格自己收回去', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()
    fixture.startEditing()

    await fixture.saveDeliverySetting()

    expect(fixture.formVisible.value).toBe(false)
    expect(fixture.botToken.value).toBe('')
  })

  it('換失敗就留在原地，讓人改完再送一次', async () => {
    telegramDeliveryApplication.loadDeliverySetting.mockResolvedValue(CONFIGURED)
    telegramDeliveryApplication.saveDeliverySetting.mockRejectedValue(
      new SecretSealUnavailableError('系統目前無法安全保存機器人金鑰'))
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()
    fixture.startEditing()

    await fixture.saveDeliverySetting()

    expect(fixture.formVisible.value).toBe(true)
    expect(fixture.saveErrorMessage.value).toContain('SECRET_SEAL_KEY')
  })

  it('移除之後回到「還沒設定」，兩格清空並攤開', async () => {
    telegramDeliveryApplication.loadDeliverySetting
      .mockResolvedValueOnce(CONFIGURED)
      .mockResolvedValueOnce(UNCONFIGURED)
    const fixture = telegramDeliveryUnderTest()
    await fixture.loadDeliverySetting()

    await fixture.removeDeliverySetting()

    expect(fixture.configured.value).toBe(false)
    expect(fixture.formVisible.value).toBe(true)
    expect(fixture.chatId.value).toBe('')
  })
})
