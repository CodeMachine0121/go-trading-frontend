import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'

export const MESSAGE_AT = new Date('2026-09-04T10:00:00.000Z')

/**
 * 對話串上的一則。內容以**真的**拆解器拆過，所以元件測試看到的塊
 * 與畫面上真正會出現的一樣——用手刻的塊會讓兩者慢慢對不上。
 */
export function buildMessage(
  role: ConversationMessageRole,
  content: string,
  note: AssistantAnswerNoteDto | null = null,
): ConversationMessageDto {
  return new ConversationMessageDto(
    role, new MessageContentDomain(content).toBlocks(), MESSAGE_AT, note)
}

/** 剛收到的那一則回答會帶的附註。 */
export function buildNote(
  queryCount = 2,
  usage = 3184,
  stoppedAtQueryLimit = false,
): AssistantAnswerNoteDto {
  return new AssistantAnswerNoteDto(queryCount, usage, stoppedAtQueryLimit)
}

export function buildSummary(
  id: number,
  messageCount = 2,
  lastActiveAt = MESSAGE_AT,
): ConversationSummaryDto {
  return new ConversationSummaryDto(id, lastActiveAt, messageCount)
}

/** 空對話上那幾句建議提問。內容不重要，重要的是有幾句與點下去會發生什麼。 */
export const SUGGESTED_PROMPTS: readonly string[] = ['系統認得哪些交易標的？', '我有哪些已存的策略？']
