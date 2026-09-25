/** 哨兵錯誤：指名的那一筆待確認修改不存在，或不是這個人的。 */
export class AssistantPendingRevisionNotFoundError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AssistantPendingRevisionNotFoundError'
  }
}
