import { describe, expect, it } from 'vitest'
import { AssistantPendingRevision } from '~/domain/models/entities/assistant-pending-revision'
import { Conversation } from '~/domain/models/entities/conversation'
import { ConversationMessage } from '~/domain/models/entities/conversation-message'
import { ConversationSummary } from '~/domain/models/entities/conversation-summary'

const LAST_ACTIVE_AT = new Date('2026-09-04T10:30:00.000Z')

describe('ConversationDomain.toDto', () => {
  it('每一則都在，由早到晚', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '問 1', new Date('2026-09-04T10:00:00.000Z'), 'answered'),
      new ConversationMessage('answer', '答 1', new Date('2026-09-04T10:01:00.000Z'), 'answered'),
    ]).toDomain().toDto()

    expect(conversationDto.id).toBe(7)
    expect(conversationDto.lastActiveAt).toBe(LAST_ACTIVE_AT)
    expect(conversationDto.messages.map(message => message.role)).toEqual(['ask', 'answer'])
  })

  it('讀回來的回答也拆成塊', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('answer', '## 小標\n一段話', LAST_ACTIVE_AT, 'answered'),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]?.blocks.map(block => block.kind))
      .toEqual(['heading', 'paragraph'])
  })

  it('讀回來的回答帶著附註', () => {
    // 提問的回應已經不帶答案了，所以那組數字改成跟著對話一起回來——
    // 它不再只屬於剛收到的那一則。
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '問 1', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('answer', '答 1', LAST_ACTIVE_AT, 'answered', '', 2, false, 3184),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]?.note).toBeNull()
    expect(conversationDto.messages[1]?.note?.label).toBe('查了 2 次 · 份量 3184')
  })

  it('提早收尾的那一則說得出它是半個答案', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('answer', '只查到這些', LAST_ACTIVE_AT, 'answered', '', 40, true, 12000),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]?.note?.stoppedAtQueryLimitLabel)
      .toBe('已達查詢次數上限，這是助手就目前所得給出的回答')
  })

  it('每一則都說得出自己那次問答走到哪裡', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '答完的', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('answer', '答案', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('ask', '還在跑的', LAST_ACTIVE_AT, 'running'),
    ]).toDomain().toDto()

    expect(conversationDto.messages.map(message => message.status))
      .toEqual(['answered', 'answered', 'running'])
  })

  it('壞掉的那一則帶著後端給的那句原因', () => {
    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '壞掉的', LAST_ACTIVE_AT, 'failed', '助手目前沒有回應，請稍後再試'),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]?.failureReason).toBe('助手目前沒有回應，請稍後再試')
  })
})

describe('ConversationDomain 這一段還在等嗎', () => {
  it('最後一則還在跑就是還在等', () => {
    // 等待那一塊由這個問句決定，不由畫面自己記著的旗標——
    // 旗標整頁重新載入就沒了，而那正是使用者最可能重整的時刻。
    const conversation = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '答完的', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('answer', '答案', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('ask', '還在跑的', LAST_ACTIVE_AT, 'running'),
    ])

    expect(conversation.toDomain().isAwaitingAnswer).toBe(true)
  })

  it('全部答完就不是在等', () => {
    const conversation = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '問', LAST_ACTIVE_AT, 'answered'),
      new ConversationMessage('answer', '答', LAST_ACTIVE_AT, 'answered'),
    ])

    expect(conversation.toDomain().isAwaitingAnswer).toBe(false)
  })

  it('壞掉的不算在等——沒有東西還在寫', () => {
    // 若把失敗算成在等，那一段對話會永遠轉圈圈，而且再也送不出下一句。
    const conversation = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '壞掉的', LAST_ACTIVE_AT, 'failed', '助手沒有回應'),
    ])

    expect(conversation.toDomain().isAwaitingAnswer).toBe(false)
  })

  it('一則都沒有的對話不是在等', () => {
    expect(new Conversation(7, LAST_ACTIVE_AT, []).toDomain().isAwaitingAnswer).toBe(false)
  })

  it('一則都沒有的對話得到空清單', () => {
    expect(new Conversation(7, LAST_ACTIVE_AT, []).toDomain().toDto().messages).toEqual([])
  })
})

describe('ConversationSummaryDomain.toDto', () => {
  it('原樣帶出識別碼、時刻與則數', () => {
    const summaryDto = new ConversationSummary(7, LAST_ACTIVE_AT, 6).toDomain().toDto()

    expect(summaryDto.id).toBe(7)
    expect(summaryDto.lastActiveAt).toBe(LAST_ACTIVE_AT)
    expect(summaryDto.messageCountLabel).toBe('6 則訊息')
  })
})

describe('ConversationDomain.toDto 帶著每一則的待確認修改', () => {
  it('那一則帶著的每一筆都轉成畫面讀得懂的樣子，其餘的一筆都沒有', () => {
    const revision = new AssistantPendingRevision(
      70, 'strategyScript', '二十根均線', '{}', 'pending', new Date('2026-09-26T08:00:00Z'))

    const conversationDto = new Conversation(7, LAST_ACTIVE_AT, [
      new ConversationMessage('ask', '改一下', new Date('2026-09-26T08:00:00Z'), 'answered'),
      new ConversationMessage('answer', '已提出', new Date('2026-09-26T08:00:00Z'), 'answered', '', 1, false, 10, [revision]),
    ]).toDomain().toDto()

    expect(conversationDto.messages[0]!.pendingRevisions).toEqual([])
    expect(conversationDto.messages[1]!.pendingRevisions.map(revisionDto => revisionDto.title))
      .toEqual(['策略腳本「二十根均線」'])
  })
})
