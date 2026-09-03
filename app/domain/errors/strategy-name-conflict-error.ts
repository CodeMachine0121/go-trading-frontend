/**
 * 哨兵錯誤：這個名稱已經被別的策略用了。
 *
 * 它自成一種而不併進一般的拒絕，是因為畫面對它的反應不同：
 * 名稱衝突要**就地標在名稱欄旁邊、對話框不關閉、已填的字不清空**，
 * 讓使用者當場改一個名字再送一次。
 */
export class StrategyNameConflictError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyNameConflictError'
  }
}
