/**
 * 一則訊息的字數上限，與 Telegram 一則訊息容得下的量相同。後端也守著它；
 * 這裡有一份，是為了讓貼太多的人當場就知道，而不是按了鍵、等了一趟才知道。
 */
const TEST_MESSAGE_MAXIMUM_LENGTH = 4096

/**
 * Domain Model：一則測試訊息送得出去嗎。
 *
 * 前後空白不算內容——只貼了幾個換行的人並沒有打算送出任何東西。
 * 但**輸入框裡的字不會被改動**：這裡算的是「送出去的會是什麼」，
 * 截掉使用者正在打的東西比擋下他更糟。
 */
export class TestMessageDomain {
  private readonly trimmedMessage: string

  constructor(message: string) {
    this.trimmedMessage = message.trim()
  }

  /** 送出去時的樣子。 */
  value(): string {
    return this.trimmedMessage
  }

  /** 目前有幾個字。數的是字元，因為上限數的也是字元。 */
  characterCount(): number {
    return [...this.trimmedMessage].length
  }

  maximumCharacterCount(): number {
    return TEST_MESSAGE_MAXIMUM_LENGTH
  }

  isSendable(): boolean {
    return this.error() === null
  }

  /** 送不出去的原因，送得出去時是 null。 */
  error(): string | null {
    if (this.trimmedMessage === '') {
      return '訊息不得為空白'
    }

    if (this.characterCount() > TEST_MESSAGE_MAXIMUM_LENGTH) {
      return `一則訊息上限為 ${TEST_MESSAGE_MAXIMUM_LENGTH} 個字元，目前有 ${this.characterCount()} 個`
    }

    return null
  }
}
