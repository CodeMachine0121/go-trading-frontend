/** 同一時間最多跑幾個非同步工作，其餘依到達順序排隊。不碰任何領域資料。 */
export class ConcurrencyLimiter {
  private runningCount = 0
  private readonly waitingStarts: Array<() => void> = []

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.runningCount < this.limit) {
      this.runningCount += 1
    }
    else {
      await new Promise<void>((start) => {
        this.waitingStarts.push(start)
      })
    }

    try {
      return await task()
    }
    finally {
      // 名額直接交棒給排隊的下一個，避免新來的插隊。
      const nextStart = this.waitingStarts.shift()
      if (nextStart === undefined) {
        this.runningCount -= 1
      }
      else {
        nextStart()
      }
    }
  }
}
