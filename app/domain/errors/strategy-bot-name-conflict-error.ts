/**
 * 哨兵錯誤：這個名稱在這位使用者自己的機器人之間已經有人用了。
 *
 * 它自成一種，是因為它是**唯一一種改個名字就能過**的拒絕——
 * 與其他拒絕混在一起，使用者會去檢查每一個欄位，而其實只有一格要改。
 */
export class StrategyBotNameConflictError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyBotNameConflictError'
  }
}
