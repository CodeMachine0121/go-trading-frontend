/** 一則訊息是誰說的：使用者的提問，或助手的回答。 */
export type ConversationMessageRole = 'ask' | 'answer'

/**
 * Entity：一段對話裡的一則訊息，後端回來的原樣。
 *
 * 它**不帶查了幾次與份量**，因為後端讀一段對話時不回那些——那組數字屬於當時那一次
 * 往返，事後拿不到。畫面因此只在剛收到的那一則上附註，這不是遺漏而是形狀。
 */
export class ConversationMessage {
  constructor(
    public readonly role: ConversationMessageRole,
    public readonly content: string,
    public readonly createdAt: Date,
  ) {}
}
