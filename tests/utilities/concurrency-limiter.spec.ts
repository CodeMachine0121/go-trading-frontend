import { describe, expect, it } from 'vitest'
import { ConcurrencyLimiter } from '~/utilities/concurrency-limiter'

function deferredTasks(count: number) {
  const started: number[] = []
  const finishers: ((succeeded: boolean) => void)[] = []
  const tasks = Array.from({ length: count }, (_, index) => () => new Promise<number>((resolve, reject) => {
    started.push(index)
    finishers[index] = succeeded => (succeeded ? resolve(index) : reject(new Error(`第 ${index} 個失敗`)))
  }))

  return { started, finishers, tasks }
}

async function settleMicrotasks() {
  for (let round = 0; round < 10; round += 1) {
    await Promise.resolve()
  }
}

describe('ConcurrencyLimiter', () => {
  it.each([
    { limit: 1, count: 3, expected: [0] },
    { limit: 3, count: 2, expected: [0, 1] },
    { limit: 3, count: 5, expected: [0, 1, 2] },
  ])('上限 $limit、送 $count 個時先開始 $expected', async ({ limit, count, expected }) => {
    const limiter = new ConcurrencyLimiter(limit)
    const { started, tasks } = deferredTasks(count)

    for (const task of tasks) {
      void limiter.run(task).catch(() => {})
    }
    await settleMicrotasks()

    expect(started).toEqual(expected)
  })

  it.each([
    { outcome: '成功', succeeded: true },
    { outcome: '失敗', succeeded: false },
  ])('前面一個$outcome就依到達順序補上下一個', async ({ succeeded }) => {
    const limiter = new ConcurrencyLimiter(2)
    const { started, finishers, tasks } = deferredTasks(4)
    for (const task of tasks) {
      void limiter.run(task).catch(() => {})
    }
    await settleMicrotasks()

    finishers[1]?.(succeeded)
    await settleMicrotasks()

    expect(started).toEqual([0, 1, 2])
  })

  it.each([
    { outcome: '成功時交回結果', succeeded: true },
    { outcome: '失敗時原樣拋出', succeeded: false },
  ])('$outcome', async ({ succeeded }) => {
    const limiter = new ConcurrencyLimiter(1)
    const { finishers, tasks } = deferredTasks(1)

    const running = limiter.run(tasks[0]!)
    await settleMicrotasks()
    finishers[0]?.(succeeded)

    if (succeeded) {
      await expect(running).resolves.toBe(0)
    }
    else {
      await expect(running).rejects.toThrow('第 0 個失敗')
    }
  })

  it('全部結束後名額回滿，下一批照樣同時開始', async () => {
    const limiter = new ConcurrencyLimiter(2)
    const first = deferredTasks(2)
    const firstRuns = first.tasks.map(task => limiter.run(task))
    await settleMicrotasks()
    first.finishers.forEach(finish => finish(true))
    await Promise.all(firstRuns)

    const second = deferredTasks(3)
    for (const task of second.tasks) {
      void limiter.run(task)
    }
    await settleMicrotasks()

    expect(second.started).toEqual([0, 1])
  })
})
