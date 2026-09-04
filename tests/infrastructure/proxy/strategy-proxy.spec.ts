import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyProxy } from '~/infrastructure/proxy/strategy-proxy'
import { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'
import { StrategyContentDto } from '~/domain/models/dto/strategy-content-dto'
import { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-parameter-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'

const BASE_URL = 'http://localhost:8080'

function writeDomainOf(id?: number): StrategyWriteDomain {
  return new StrategyWriteDomain(new StrategyWriteDto(
    '二十根均線', new StrategyContentDto('sum := 0.0', 'floatList'), id))
}

function strategyWireOf(id: number, name: string) {
  return {
    id,
    name,
    script: 'package main\n\nfunc Calculate(data []indicator.KCandle) map[string][]float64 {\n\tsum := 0.0\n}\n',
    resultType: 'floatList',
  }
}

/** 用真正的 FetchError 當替身：它連不上時照樣有 response 屬性，只是值為 undefined。 */
function buildFetchError(failure: { status?: number, message?: string }) {
  const context = failure.status === undefined
    ? { request: BASE_URL, options: {}, error: new Error('fetch failed') }
    : {
        request: BASE_URL,
        options: {},
        response: {
          status: failure.status,
          statusText: 'rejected',
          _data: failure.message === undefined ? undefined : { message: failure.message },
        },
      }

  return createFetchError(context as unknown as FetchContext)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StrategyProxy.listStrategies', () => {
  it('把後端給的每一支收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      strategyWireOf(1, '二十根均線'),
      strategyWireOf(2, '六十根均線'),
    ]))

    const strategies = await new StrategyProxy(BASE_URL).listStrategies()

    expect(strategies).toHaveLength(2)
    expect(strategies[0]?.id).toBe(1)
    expect(strategies[0]?.name).toBe('二十根均線')
    expect(strategies[0]?.resultType).toBe('floatList')
    expect(strategies[1]?.name).toBe('六十根均線')
  })

  it('一支都沒有是空陣列，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([]))

    await expect(new StrategyProxy(BASE_URL).listStrategies()).resolves.toEqual([])
  })

  it('打的是策略端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue([])
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyProxy(BASE_URL).listStrategies()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/strategies', {})
  })

  it('連不上後端時說得出來', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new StrategyProxy(BASE_URL).listStrategies())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('StrategyProxy.createStrategy', () => {
  it('把名稱與一整段算式送到策略端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyWireOf(7, '二十根均線'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyProxy(BASE_URL).createStrategy(writeDomainOf())

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/strategies', {
      method: 'POST',
      body: {
        name: '二十根均線',
        script: writeDomainOf().script,
        resultType: 'floatList',
        // 一支沒有旋鈕的算式送出的是一份空的，不是什麼都不送——
        // 「沒有旋鈕」與「這次不提旋鈕」在改寫時是兩件事。
        parameters: [],
      },
    })
  })

  it('回傳後端存下來的那一支，含它給的識別碼', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(strategyWireOf(7, '二十根均線')))

    const strategy = await new StrategyProxy(BASE_URL).createStrategy(writeDomainOf())

    expect(strategy.id).toBe(7)
  })

  it('名稱已被使用時說的是名稱被佔用，不是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '策略名稱「二十根均線」已被使用' })))

    const create = new StrategyProxy(BASE_URL).createStrategy(writeDomainOf())

    await expect(create).rejects.toBeInstanceOf(StrategyNameConflictError)
    await expect(create).rejects.toThrow('策略名稱「二十根均線」已被使用')
  })
})

describe('StrategyProxy.updateStrategy', () => {
  it('打的是那一支策略自己的路徑', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyWireOf(7, '二十根均線'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyProxy(BASE_URL).updateStrategy(writeDomainOf(7))

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategies/7', expect.objectContaining({ method: 'PUT' }))
  })

  it('找不到那一支時說的是找不到', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 404, message: '找不到識別碼為 7 的策略' })))

    const update = new StrategyProxy(BASE_URL).updateStrategy(writeDomainOf(7))

    await expect(update).rejects.toBeInstanceOf(StrategyNotFoundError)
    await expect(update).rejects.toThrow('找不到識別碼為 7 的策略')
  })

  it('名稱撞到別的策略時說的是名稱被佔用', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status: 409 })))

    await expect(new StrategyProxy(BASE_URL).updateStrategy(writeDomainOf(7)))
      .rejects.toBeInstanceOf(StrategyNameConflictError)
  })
})

describe('StrategyProxy.deleteStrategy', () => {
  it('打的是那一支策略自己的路徑', async () => {
    const fetchMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyProxy(BASE_URL).deleteStrategy(7)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategies/7', { method: 'DELETE' })
  })

  it('找不到那一支時說的是找不到', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status: 404 })))

    await expect(new StrategyProxy(BASE_URL).deleteStrategy(7))
      .rejects.toBeInstanceOf(StrategyNotFoundError)
  })
})

describe('StrategyProxy 其餘的拒絕', () => {
  it.each([
    { name: '建立', act: (proxy: StrategyProxy) => proxy.createStrategy(writeDomainOf()) },
    { name: '改寫', act: (proxy: StrategyProxy) => proxy.updateStrategy(writeDomainOf(7)) },
    { name: '刪除', act: (proxy: StrategyProxy) => proxy.deleteStrategy(7) },
  ])('$name 遇到內容不合規則時原樣往上拋，不當成名稱衝突也不當成找不到', async ({ act }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '計算根數必須大於零' })))

    const rejection = act(new StrategyProxy(BASE_URL))

    await expect(rejection).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(rejection).rejects.not.toBeInstanceOf(StrategyNameConflictError)
    await expect(rejection).rejects.not.toBeInstanceOf(StrategyNotFoundError)
  })

  it.each([
    { name: '建立', act: (proxy: StrategyProxy) => proxy.createStrategy(writeDomainOf()) },
    { name: '改寫', act: (proxy: StrategyProxy) => proxy.updateStrategy(writeDomainOf(7)) },
    { name: '刪除', act: (proxy: StrategyProxy) => proxy.deleteStrategy(7) },
  ])('$name 連不上後端時說得出來', async ({ act }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(act(new StrategyProxy(BASE_URL))).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('StrategyProxy：策略記著的旋鈕', () => {
  it('存下去時把旋鈕一起送出，預設值就是畫面上那個數字', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyWireOf(1, '布林通道'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyProxy(BASE_URL).createStrategy(new StrategyWriteDomain(new StrategyWriteDto(
      '布林通道',
      new StrategyContentDto('sum := 0.0', 'floatList', [
        new StrategyParameterDto('期數', 'lookbackCount', 20),
        new StrategyParameterDto('倍數', 'number', 1.5),
      ]))))

    expect(fetchMock.mock.calls[0]![1].body.parameters).toEqual([
      { name: '期數', kind: 'lookbackCount', defaultValue: 20 },
      { name: '倍數', kind: 'number', defaultValue: 1.5 },
    ])
  })

  it('讀回來時把後端的預設值收成畫面上那個數字', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      ...strategyWireOf(1, '布林通道'),
      parameters: [{ name: '期數', kind: 'lookbackCount', defaultValue: 20 }],
    }]))

    const strategies = await new StrategyProxy(BASE_URL).listStrategies()

    expect(strategies[0]?.parameters).toEqual([
      expect.objectContaining({ name: '期數', kind: 'lookbackCount', value: 20 }),
    ])
  })

  it.each(STRATEGY_PARAMETER_KINDS.map(kind => ({ kind })))(
    '$kind 這一種存進去讀回來還是同一種', async ({ kind }) => {
      // 這一條走過**每一種**，而不是列幾種來測：漏掉一種的後果是
      // 存好的東西讀回來換了一種種類，而那不會有任何地方報錯。
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
        ...strategyWireOf(1, '布林通道'),
        parameters: [{ name: '旋鈕', kind, defaultValue: 1 }],
      }]))

      const strategies = await new StrategyProxy(BASE_URL).listStrategies()

      expect(strategies[0]?.parameters[0]?.kind).toBe(kind)
    })

  it('認不得的種類一律當成數值——它不會憑空變成回看根數去多拿 K 線', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([{
      ...strategyWireOf(1, '布林通道'),
      parameters: [{ name: '期數', kind: '未來才有的種類', defaultValue: 20 }],
    }]))

    const strategies = await new StrategyProxy(BASE_URL).listStrategies()

    expect(strategies[0]?.parameters[0]?.kind).toBe('number')
  })

  it('後端那一支沒有旋鈕這個欄位時，收成一支都沒有', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([strategyWireOf(1, '二十根均線')]))

    const strategies = await new StrategyProxy(BASE_URL).listStrategies()

    expect(strategies[0]?.parameters).toEqual([])
  })
})
