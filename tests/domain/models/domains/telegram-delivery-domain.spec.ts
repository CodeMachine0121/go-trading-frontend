import { describe, expect, it } from 'vitest'
import { TelegramDeliveryDomain } from '~/domain/models/domains/telegram-delivery-domain'
import { TelegramDelivery } from '~/domain/models/entities/telegram-delivery'

describe('TelegramDeliveryDomain', () => {
  it('已設定時說得出存著的是哪一組金鑰', () => {
    // 這句話是使用者唯一能用來認出「是不是我貼的那一組」的線索。
    const deliveryDto = new TelegramDeliveryDomain(
      new TelegramDelivery(true, '987654', '1234')).toDto()

    expect(deliveryDto.configured).toBe(true)
    expect(deliveryDto.chatId).toBe('987654')
    expect(deliveryDto.botTokenTail).toBe('1234')
    expect(deliveryDto.summary).toBe('金鑰結尾 1234')
  })

  it('那句話不重複畫面上已經有的東西', () => {
    // 聊天室代號就在下面那一格輸入框裡。說第二次只是把同一個數字擺兩份，
    // 而兩份遲早會有人以為它們是兩件事。
    const deliveryDto = new TelegramDeliveryDomain(
      new TelegramDelivery(true, '987654', '1234')).toDto()

    expect(deliveryDto.summary).not.toContain('987654')
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

    expect(deliveryDto.summary).toBe('金鑰已設定')
  })
})
