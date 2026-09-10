import { describe, expect, it, vi } from 'vitest'
import type { ITelegramDeliveryProxy } from '~/domain/interface/i-telegram-delivery-proxy'
import { TelegramDeliveryApplication } from '~/application/telegram-delivery-application'
import { TelegramDeliveryService } from '~/domain/service/telegram-delivery-service'
import { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'
import { TelegramNotConfiguredError } from '~/domain/errors/telegram-not-configured-error'

const CONFIGURED = new TelegramDelivery(true, '987654', '1234')
const UNCONFIGURED = new TelegramDelivery(false, '', '')

/** 注入真實的 domain service 與 domain model，只 mock 最外層的 proxy。 */
function buildFixture(overrides: Partial<Record<keyof ITelegramDeliveryProxy, ReturnType<typeof vi.fn>>> = {}) {
  const telegramDeliveryProxy = {
    fetchDeliverySetting: overrides.fetchDeliverySetting ?? vi.fn().mockResolvedValue(CONFIGURED),
    saveDeliverySetting: overrides.saveDeliverySetting ?? vi.fn().mockResolvedValue(CONFIGURED),
    removeDeliverySetting: overrides.removeDeliverySetting ?? vi.fn().mockResolvedValue(undefined),
    sendTestMessage: overrides.sendTestMessage ?? vi.fn().mockResolvedValue(null),
  }

  return {
    application: new TelegramDeliveryApplication(
      new TelegramDeliveryService(telegramDeliveryProxy as unknown as ITelegramDeliveryProxy)),
    telegramDeliveryProxy,
  }
}

describe('TelegramDeliveryApplication.loadDeliverySetting', () => {
  it('已設定時說得出結尾與那句提醒', async () => {
    const { application } = buildFixture()

    const setting = await application.loadDeliverySetting()

    expect(setting.configured).toBe(true)
    expect(setting.chatId).toBe('987654')
    expect(setting.summary).toContain('結尾 1234')
  })

  it('還沒設定過不是錯誤', async () => {
    const { application } = buildFixture({
      fetchDeliverySetting: vi.fn().mockResolvedValue(UNCONFIGURED),
    })

    const setting = await application.loadDeliverySetting()

    expect(setting.configured).toBe(false)
    expect(setting.summary).toBeNull()
  })
})

describe('TelegramDeliveryApplication.saveDeliverySetting', () => {
  it('兩格去掉前後空白再送出去', async () => {
    // 貼過來的東西常常拖著換行，而沒有人打算把換行也設定進去。
    const { application, telegramDeliveryProxy } = buildFixture()

    await application.saveDeliverySetting('  123456:AAH  ', '\t987654\n')

    expect(telegramDeliveryProxy.saveDeliverySetting).toHaveBeenCalledWith(
      expect.objectContaining({ botToken: '123456:AAH', chatId: '987654' }))
  })
})

describe('TelegramDeliveryApplication.sendTestMessage', () => {
  it('送到了就說送到了', async () => {
    const { application } = buildFixture()

    const result = await application.sendTestMessage('哈囉')

    expect(result.delivered).toBe(true)
    expect(result.failureSentence).toBeNull()
  })

  it('送出去的是去掉前後空白之後的樣子', async () => {
    const { application, telegramDeliveryProxy } = buildFixture()

    await application.sendTestMessage('  哈囉  ')

    expect(telegramDeliveryProxy.sendTestMessage).toHaveBeenCalledWith('哈囉')
  })

  it.each([
    ['credentialRejected', '金鑰'],
    ['destinationNotFound', '聊天室'],
    ['unreachable', '連不上'],
    ['timedOut', '太久'],
  ])('%s 回來時，講的是那一件事', async (reason, expectedFragment) => {
    const { application } = buildFixture({
      sendTestMessage: vi.fn().mockResolvedValue(reason),
    })

    const result = await application.sendTestMessage('哈囉')

    expect(result.delivered).toBe(false)
    expect(result.failureSentence).toContain(expectedFragment)
  })

  it.each([
    ['空白的訊息', '   ', '訊息不得為空白'],
    ['超過上限的訊息', '字'.repeat(4097), '一則訊息上限為 4096 個字元，目前有 4097 個'],
  ])('%s根本不送出，當場說明原因', async (_situation, message, expectedSentence) => {
    const { application, telegramDeliveryProxy } = buildFixture()

    const result = await application.sendTestMessage(message)

    expect(result.delivered).toBe(false)
    expect(result.failureSentence).toBe(expectedSentence)
    expect(telegramDeliveryProxy.sendTestMessage).not.toHaveBeenCalled()
  })

  it('還沒設定過時原樣把那一種拋出去', async () => {
    // 畫面要據它把人指向上面那張卡，而不是指向他剛打的那句話。
    const rejection = new TelegramNotConfiguredError('尚未完成 Telegram 設定')
    const { application } = buildFixture({
      sendTestMessage: vi.fn().mockRejectedValue(rejection),
    })

    await expect(application.sendTestMessage('哈囉')).rejects.toBe(rejection)
  })
})

describe('TelegramDeliveryApplication.removeDeliverySetting', () => {
  it('整份移除', async () => {
    const { application, telegramDeliveryProxy } = buildFixture()

    await application.removeDeliverySetting()

    expect(telegramDeliveryProxy.removeDeliverySetting).toHaveBeenCalledOnce()
  })
})
