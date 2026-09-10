import { describe, expect, it } from 'vitest'
import { deliveryFailureSentence } from '~/domain/models/vo/delivery-failure-reason'

describe('deliveryFailureSentence', () => {
  it.each([
    ['credentialRejected', '金鑰'],
    ['destinationNotFound', '聊天室'],
    ['timedOut', '太久'],
    ['unreachable', '連不上'],
  ])('%s 說的是自己那一件事', (reason, expectedFragment) => {
    expect(deliveryFailureSentence(reason)).toContain(expectedFragment)
  })

  it('四種原因說四句不同的話', () => {
    // 合成一句，一個只是打錯聊天室代號的人會去重新產生一支從來沒錯的機器人金鑰。
    const sentences = [
      'credentialRejected', 'destinationNotFound', 'timedOut', 'unreachable',
    ].map(deliveryFailureSentence)

    expect(new Set(sentences).size).toBe(4)
  })

  it('認不得的原因說「稍後再試」，不叫人去改一格其實沒錯的東西', () => {
    // 後端哪天多一種，畫面該說的是稍後再試，不是一片空白。
    expect(deliveryFailureSentence('somethingNew')).toBe('連不上 Telegram，請稍後再試。')
  })
})
