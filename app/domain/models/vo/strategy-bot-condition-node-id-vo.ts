/**
 * VO：一個條件節點在畫面上的身分。
 *
 * 它**只活在這一側**——後端既不收也不給。存在的唯一理由是 Vue 的 `key`：
 * 用陣列索引當 key 的話，刪掉中間一句時後面每一句的 key 都往前挪一格，
 * Vue 會重用錯的那一格 DOM，使用者看到的是「另一句的內容跳到這一格」——
 * 一個看起來像資料壞掉的畫面問題。
 *
 * 它是一個型別而不是兩個地方各自寫一次那三行，因為**兩個地方寫的話，
 * 兩個地方就各有一份「為什麼需要它」的理解**，而其中一份遲早會被簡化掉。
 *
 * 產生在建構子裡而不是一個工廠方法：要一個新的身分，就建一個新的。
 */
export class StrategyBotConditionNodeIdVo {
  public readonly value: string

  constructor() {
    this.value = `node-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
  }
}
