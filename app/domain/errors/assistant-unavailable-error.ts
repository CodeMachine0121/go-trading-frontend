/**
 * 哨兵錯誤：助手沒有回應——連不上、太慢、或回了空白。
 *
 * 三者對使用者是同一件事（稍後再試），因此是同一種錯誤。它與
 * BackendUnreachableError 不同：後端活著，是它後面那位助手不在。
 */
export class AssistantUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'AssistantUnavailableError'
  }
}
