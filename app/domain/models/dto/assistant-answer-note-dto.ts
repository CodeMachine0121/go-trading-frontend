/**
 * DTO：剛收到那一則回答下方那一行低調的說明。
 *
 * 它只屬於**剛收到的那一則**。從對話裡讀回來的訊息沒有這一份，因為後端不會再回那組數字。
 * 與其為了前後對稱而全部不顯示，不如在拿得到的時候誠實顯示。
 *
 * 說法寫在這裡而不是元件上：抽屜與整頁都要說同一句話，寫兩次就會有兩種說法。
 * 這與其他 DTO 帶取值器是同一件事——形狀轉換，不是業務規則。
 */
export class AssistantAnswerNoteDto {
  constructor(
    public readonly queryCount: number,
    public readonly usage: number,
    public readonly stoppedAtQueryLimit: boolean,
  ) {}

  /**
   * 一行的說法。**一次都沒查時不講「查了 0 次」**——那是一句沒有資訊的話，
   * 而且會讓人以為查詢失敗了。
   */
  get label(): string {
    const usageLabel = `份量 ${this.usage}`

    return this.queryCount === 0
      ? usageLabel
      : `查了 ${this.queryCount} 次 · ${usageLabel}`
  }

  /**
   * 助手用完查詢次數而沒講到結論時要多說的那一句，否則是 `null`。
   *
   * 語氣是提醒而不是錯誤：半個誠實的答案比沒有答案有用，
   * 但使用者得知道它是半個，否則會把它當成完整的結論用。
   */
  get stoppedAtQueryLimitLabel(): string | null {
    return this.stoppedAtQueryLimit
      ? '已達查詢次數上限，這是助手就目前所得給出的回答'
      : null
  }
}
