import { describe, expect, it } from 'vitest'
import { TelegramDeliveryDomain } from '~/domain/models/domains/telegram-delivery-domain'
import { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'

describe('TelegramDeliveryDomain', () => {
  it('已設定時說得出結尾，也說得出那一格為什麼是空的', () => {
    // 後半句是必要的：少了它，使用者會以為畫面把他的金鑰弄丟了。
    const deliveryDto = new TelegramDeliveryDomain(
      new TelegramDelivery(true, '987654', '1234')).toDto()

    expect(deliveryDto.configured).toBe(true)
    expect(deliveryDto.chatId).toBe('987654')
    expect(deliveryDto.botTokenTail).toBe('1234')
    expect(deliveryDto.summary).toBe('已設定，結尾 1234；要更換請重新填入整串金鑰。')
  })

  it('還沒設定過時沒有那一句話', () => {
    // 還沒設定是正常狀態，不是錯誤——畫面據它畫空狀態。
    const deliveryDto = new TelegramDeliveryDomain(
      new TelegramDelivery(false, '', '')).toDto()

    expect(deliveryDto.configured).toBe(false)
    expect(deliveryDto.summary).toBeNull()
  })

  it('後端遮到連結尾都不剩時，就少說那半句，不自己補一個', () => {
    // 後端對短到遮不住的金鑰回一個空的結尾，而不是回整串。
    const deliveryDto = new TelegramDeliveryDomain(
      new TelegramDelivery(true, '987654', '')).toDto()

    expect(deliveryDto.summary).toBe('已設定；要更換請重新填入整串金鑰。')
  })
})
