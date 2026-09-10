import { describe, expect, it } from 'vitest'
import { DeliveryFailureDomain } from '~/domain/models/domains/delivery-failure-domain'

describe('DeliveryFailureDomain', () => {
  it.each([
    ['credentialRejected', '金鑰'],
    ['destinationNotFound', '聊天室'],
    ['timedOut', '太久'],
    ['unreachable', '連不上'],
  ])('%s 說的是自己那一件事', (reason, expectedFragment) => {
    expect(new DeliveryFailureDomain(reason).sentence()).toContain(expectedFragment)
  })

  it('四種原因說四句不同的話', () => {
    // 合成一句，一個只是打錯聊天室代號的人會去重新產生一支從來沒錯的機器人金鑰。
    const sentences = [
      'credentialRejected', 'destinationNotFound', 'timedOut', 'unreachable',
    ].map(reason => new DeliveryFailureDomain(reason).sentence())

    expect(new Set(sentences).size).toBe(4)
  })

  it('認不得的原因說「稍後再試」，不叫人去改一格其實沒錯的東西', () => {
    // 後端哪天多一種，畫面該說的是稍後再試，不是一片空白，也不是一個英文代號。
    expect(new DeliveryFailureDomain('somethingNew').sentence()).toBe('連不上 Telegram，請稍後再試。')
  })

  it('前後空白不影響它認不認得', () => {
    expect(new DeliveryFailureDomain('  timedOut  ').sentence()).toContain('太久')
  })
})
