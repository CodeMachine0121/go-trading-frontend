import { describe, expect, it } from 'vitest'
import { TestMessageDomain } from '~/domain/models/domains/test-message-domain'

describe('TestMessageDomain', () => {
  it('一則普通的訊息送得出去', () => {
    const testMessage = new TestMessageDomain('這是一則來自 go-trading 的測試訊息。')

    expect(testMessage.isSendable()).toBe(true)
    expect(testMessage.error()).toBeNull()
  })

  it('送出去的是去掉前後空白之後的樣子', () => {
    // 只貼了幾個換行的人並沒有打算送出任何東西。
    const testMessage = new TestMessageDomain('  哈囉  \n')

    expect(testMessage.value()).toBe('哈囉')
  })

  it.each([
    ['整個空的', ''],
    ['只有空白與換行', '   \n\t '],
  ])('%s的訊息送不出去', (_situation, message) => {
    const testMessage = new TestMessageDomain(message)

    expect(testMessage.isSendable()).toBe(false)
    expect(testMessage.error()).toBe('訊息不得為空白')
  })

  it('剛好 4096 個字元送得出去', () => {
    expect(new TestMessageDomain('字'.repeat(4096)).isSendable()).toBe(true)
  })

  it('4097 個字元送不出去，而且說得出現在有幾個字', () => {
    // 上限是拒絕而不是截斷：被截短的人不會知道自己送出去的是半則。
    const testMessage = new TestMessageDomain('字'.repeat(4097))

    expect(testMessage.isSendable()).toBe(false)
    expect(testMessage.error()).toBe('一則訊息上限為 4096 個字元，目前有 4097 個')
  })

  it('字數數的是字元，不是位元組', () => {
    // 一個中文字是三個位元組，而一則訊息容得下的是字元。
    expect(new TestMessageDomain('字'.repeat(2000)).characterCount()).toBe(2000)
    expect(new TestMessageDomain('字'.repeat(2000)).isSendable()).toBe(true)
  })

  it('字數不把前後空白算進去', () => {
    expect(new TestMessageDomain('   哈囉   ').characterCount()).toBe(2)
  })

  it('說得出上限是幾個字', () => {
    expect(new TestMessageDomain('哈囉').maximumCharacterCount()).toBe(4096)
  })
})
