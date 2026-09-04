import { describe, expect, it } from 'vitest'
import { AssistantAskDto } from '~/domain/models/dto/assistant-ask-dto'

const ASKED_AT = new Date('2026-09-04T10:00:00.000Z')

describe('AssistantAskDto.toMessageDto', () => {
  it('變成對話串上的一則提問', () => {
    // 提問要在送出的那一刻就出現在對話串上——等待可能長達兩分鐘，
    // 那兩分鐘裡使用者得看得到自己問了什麼。
    const messageDto = new AssistantAskDto(null, 'BTCUSDT 最近走勢如何').toMessageDto(ASKED_AT)

    expect(messageDto.role).toBe('ask')
    expect(messageDto.createdAt).toBe(ASKED_AT)
    expect(messageDto.blocks).toHaveLength(1)
    expect(messageDto.blocks[0]?.lines[0]?.[0]?.text).toBe('BTCUSDT 最近走勢如何')
  })

  it('提問也拆成塊，與回答走同一條路', () => {
    // 一句話走同一條路出來，對話串因此只有一種渲染方式，
    // 不會多出「這一則要不要拆」這個沒有好答案的分支。
    const messageDto = new AssistantAskDto(null, '第一行\n第二行').toMessageDto(ASKED_AT)

    expect(messageDto.blocks[0]?.lines).toHaveLength(2)
  })

  it('提問上沒有附註', () => {
    expect(new AssistantAskDto(null, '問一句').toMessageDto(ASKED_AT).note).toBeNull()
  })
})
