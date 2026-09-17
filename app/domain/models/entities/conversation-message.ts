import type { AssistantTurnStatus } from '~/domain/models/entities/assistant-turn-status'

/** 一則訊息是誰說的：使用者的提問，或助手的回答。 */
export type ConversationMessageRole = 'ask' | 'answer'

/**
 * Entity：一段對話裡的一則訊息，後端回來的原樣。
 *
 * 它帶著**那一次問答走到哪裡**，不只帶內容。一段對話讀回來可能含著一則還在寫的、
 * 一則壞掉的，而只看文字的讀者沒有辦法把這兩種與「還沒問」分開。
 *
 * 後面三個數字描述的是**那一次往返**而不是這則話的內容：查了幾次、有沒有因為用完
 * 查詢次數而提早收尾、動用多少份量。它們以前只在剛收到那一刻拿得到，
 * 現在跟著對話一起回來——因為提問的回應已經不帶答案了，這裡是它們唯一活下來的地方。
 */
export class ConversationMessage {
  constructor(
    public readonly role: ConversationMessageRole,
    public readonly content: string,
    public readonly createdAt: Date,
    public readonly status: AssistantTurnStatus,
    /** 那一次壞掉的原因。只有失敗的那一則有內容。 */
    public readonly failureReason: string = '',
    /** 以下三個只有回答那一則有。 */
    public readonly queryCount: number = 0,
    public readonly stoppedAtQueryLimit: boolean = false,
    public readonly usage: number = 0,
  ) {}
}
