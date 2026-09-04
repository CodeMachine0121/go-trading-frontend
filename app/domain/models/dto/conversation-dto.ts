import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'

/**
 * DTO：一整段對話離開 domain 的唯一形狀。**每一則都在**——
 * 助手只看得到最近幾則是後端的事，人能讀多少是另一回事。
 */
export class ConversationDto {
  constructor(
    public readonly id: number,
    public readonly lastActiveAt: Date,
    public readonly messages: readonly ConversationMessageDto[],
  ) {}
}
