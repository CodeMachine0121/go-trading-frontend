/**
 * 哨兵錯誤：後端說它目前沒有東西可以把機器人金鑰鎖起來，所以拒絕保存。
 *
 * 它與其他拒絕分開，因為使用者要做的事完全不同：**什麼都不必改**。
 * 他貼的金鑰好得很，缺的是後端的一項設定。混在一般拒絕裡，他會把整串金鑰
 * 重貼三次，然後去重新產生一支。
 */
export class SecretSealUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'SecretSealUnavailableError'
  }
}
