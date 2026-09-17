import { MessageContentDomain } from '~/domain/models/domains/message-content-domain'
import { AssistantAnswerNoteDto } from '~/domain/models/dto/assistant-answer-note-dto'
import { ConversationDto } from '~/domain/models/dto/conversation-dto'
import { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { ConversationSummaryDto } from '~/domain/models/dto/conversation-summary-dto'
import type { AssistantTurnStatus } from '~/domain/models/entities/assistant-turn-status'
import type { ConversationMessageRole } from '~/domain/models/entities/conversation-message'

export const MESSAGE_AT = new Date('2026-09-04T10:00:00.000Z')

/**
 * 對話串上的一則。內容以**真的**拆解器拆過，所以元件測試看到的塊
 * 與畫面上真正會出現的一樣——用手刻的塊會讓兩者慢慢對不上。
 *
 * 預設是答完的那一種，因為絕大多數案例談的不是狀態；要談狀態的案例自己指名。
 */
export function buildMessage(
  role: ConversationMessageRole,
  content: string,
  note: AssistantAnswerNoteDto | null = null,
  status: AssistantTurnStatus = 'answered',
  failureReason = '',
): ConversationMessageDto {
  return new ConversationMessageDto(
    role, content, new MessageContentDomain(content).toBlocks(), MESSAGE_AT,
    status, note, failureReason)
}

/** 一則回答會帶的附註。 */
export function buildNote(
  queryCount = 2,
  usage = 3184,
  stoppedAtQueryLimit = false,
): AssistantAnswerNoteDto {
  return new AssistantAnswerNoteDto(queryCount, usage, stoppedAtQueryLimit)
}

/**
 * 一段從後端讀回來的對話。
 *
 * 回頭詢問讀回的就是這個形狀，所以「還在寫」「寫完了」「壞掉了」三種案例
 * 都是拿它換不同的最後一則。
 */
export function buildConversation(
  id: number,
  messages: readonly ConversationMessageDto[],
): ConversationDto {
  return new ConversationDto(id, MESSAGE_AT, messages)
}

export function buildSummary(
  id: number,
  messageCount = 2,
  lastActiveAt = MESSAGE_AT,
): ConversationSummaryDto {
  return new ConversationSummaryDto(id, lastActiveAt, messageCount)
}

/** 空對話上那幾句建議提問。內容不重要，重要的是有幾句與點下去會發生什麼。 */
export const SUGGESTED_PROMPTS: readonly string[] = ['系統認得哪些交易標的？', '我有哪些已存的策略腳本？']
