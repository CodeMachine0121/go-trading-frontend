/**
 * 哨兵錯誤：指名的那一台機器人不存在（例如它已經在別處被刪掉）。
 *
 * 它自成一種，是因為「找不到那一台」與「內容不合規則」是兩件不同的事：
 * 前者改內容沒有用，後者改了就能過。
 */
export class StrategyBotNotFoundError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StrategyBotNotFoundError'
  }
}
