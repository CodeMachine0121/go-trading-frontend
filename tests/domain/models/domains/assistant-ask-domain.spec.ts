import { describe, expect, it } from 'vitest'
import { AssistantAskDomain } from '~/domain/models/domains/assistant-ask-domain'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'

describe('AssistantAskDomain', () => {
  it.each([
    { question: 'BTCUSDT 最近走勢如何', expectedQuestion: 'BTCUSDT 最近走勢如何' },
    { question: '  BTCUSDT 最近走勢  ', expectedQuestion: 'BTCUSDT 最近走勢' },
    { question: '　全形空白包住　', expectedQuestion: '全形空白包住' },
  ])('留下的是去掉前後空白之後那一份（$question）', ({ question, expectedQuestion }) => {
    const askDomain = new AssistantAskDomain(new AssistantAskDto(null, question))

    expect(askDomain.question).toBe(expectedQuestion)
    expect(askDomain.canSend).toBe(true)
  })

  it.each([
    { question: '' },
    { question: '   ' },
    { question: '\t\n ' },
    { question: '　' },
  ])('說了等於沒說的一句送不出去（$question）', ({ question }) => {
    // 空白送出去只是花錢換一句「必須寫點什麼」，而那句話這一側就說得出來。
    expect(new AssistantAskDomain(new AssistantAskDto(null, question)).canSend).toBe(false)
  })

  it.each([
    { conversationId: null },
    { conversationId: 7 },
  ])('指名哪一段對話原樣帶著（$conversationId）', ({ conversationId }) => {
    const askDomain = new AssistantAskDomain(new AssistantAskDto(conversationId, '問一句'))

    expect(askDomain.conversationId).toBe(conversationId)
  })
})
