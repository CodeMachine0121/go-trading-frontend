import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyScriptProxy } from '~/infrastructure/proxy/strategy-script-proxy'
import { signedInSessionStorage, SIGNED_IN_HEADERS } from '../../fixtures/session-storage'
import { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-script-parameter-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { StrategyScriptNameConflictError } from '~/domain/errors/strategy-script-name-conflict-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'

const BASE_URL = 'http://localhost:8080'

function writeDomainOf(id?: number): StrategyScriptWriteDomain {
  return new StrategyScriptWriteDomain(new StrategyScriptWriteDto(
    '二十根均線', new StrategyScriptContentDto('sum := 0.0', 'floatList'), id))
}

function strategyScriptWireOf(id: number, name: string) {
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

describe('StrategyScriptProxy.listStrategyScripts', () => {
  it('把後端給的每一支收成領域看得懂的形狀', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      mine: [strategyScriptWireOf(1, '二十根均線'), strategyScriptWireOf(2, '六十根均線')],
      adopted: [],
    }))

    const { mine: strategyScripts } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(strategyScripts).toHaveLength(2)
    expect(strategyScripts[0]?.id).toBe(1)
    expect(strategyScripts[0]?.name).toBe('二十根均線')
    expect(strategyScripts[0]?.resultType).toBe('floatList')
    expect(strategyScripts[1]?.name).toBe('六十根均線')
  })

  it('從市集加入的那一段是副本：用它自己的識別碼、沒有算式、不說是誰、何時分享的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      mine: [],
      adopted: [{
        ...strategyScriptWireOf(20, '動能'),
        script: '',
        isAdoptedFromMarketplace: true,
        createdAt: '2026-09-26T08:00:00Z',
        parameters: [{ name: '期數', kind: 'lookbackCount', defaultValue: 20 }],
      }],
    }))

    const { adopted } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(adopted).toHaveLength(1)
    expect(adopted[0]?.id).toBe(20)
    expect(adopted[0]?.name).toBe('動能')
    expect(adopted[0]?.publisherEmail).toBeNull()
    expect(adopted[0]?.publishedAt).toBeNull()
    expect(adopted[0]?.parameters.map(parameter => parameter.name)).toEqual(['期數'])
    expect(adopted[0]).not.toHaveProperty('script')
  })

  it('一支都沒有是空陣列，不是錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ mine: [], adopted: [] }))

    const available = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(available.mine).toEqual([])
    expect(available.adopted).toEqual([])
  })

  it('打的是策略腳本端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ mine: [], adopted: [] })
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).listAvailableStrategyScripts()

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/strategy-scripts', { headers: SIGNED_IN_HEADERS })
  })

  it('連不上後端時說得出來', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).listAvailableStrategyScripts())
      .rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('StrategyScriptProxy.createStrategyScript', () => {
  it('把名稱與一整段算式送到策略腳本端點', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyScriptWireOf(7, '二十根均線'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).createStrategyScript(writeDomainOf())

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:8080/strategy-scripts', {
      headers: SIGNED_IN_HEADERS,
      method: 'POST',
      body: {
        name: '二十根均線',
        // 沒寫說明送出的是空字串，不是什麼都不送——「沒有說明」是一個值，
        // 改寫時必須說得出來，否則舊的說明會留在那裡。
        description: '',
        script: writeDomainOf().script,
        resultType: 'floatList',
        // 沒說是哪一種行情的內容就是 K 線；每一次存檔都說出來，改寫時照抄原本那一種不算更換。
        marketDataKind: 'kCandle',
        // 一支沒有旋鈕的算式送出的是一份空的，不是什麼都不送——
        // 「沒有旋鈕」與「這次不提旋鈕」在改寫時是兩件事。
        parameters: [],
      },
    })
  })

  it('回傳後端存下來的那一支，含它給的識別碼', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(strategyScriptWireOf(7, '二十根均線')))

    const strategyScript = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).createStrategyScript(writeDomainOf())

    expect(strategyScript.id).toBe(7)
  })

  it('名稱已被使用時說的是名稱被佔用，不是一般的拒絕', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 409, message: '策略腳本名稱「二十根均線」已被使用' })))

    const create = new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).createStrategyScript(writeDomainOf())

    await expect(create).rejects.toBeInstanceOf(StrategyScriptNameConflictError)
    await expect(create).rejects.toThrow('策略腳本名稱「二十根均線」已被使用')
  })
})

describe('StrategyScriptProxy.updateStrategyScript', () => {
  it('打的是那一支策略腳本自己的路徑', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyScriptWireOf(7, '二十根均線'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).updateStrategyScript(writeDomainOf(7))

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategy-scripts/7', expect.objectContaining({ method: 'PUT' }))
  })

  it('找不到那一支時說的是找不到', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 404, message: '找不到識別碼為 7 的策略腳本' })))

    const update = new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).updateStrategyScript(writeDomainOf(7))

    await expect(update).rejects.toBeInstanceOf(StrategyScriptNotFoundError)
    await expect(update).rejects.toThrow('找不到識別碼為 7 的策略腳本')
  })

  it('名稱撞到別的策略腳本時說的是名稱被佔用', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status: 409 })))

    await expect(new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).updateStrategyScript(writeDomainOf(7)))
      .rejects.toBeInstanceOf(StrategyScriptNameConflictError)
  })
})

describe('StrategyScriptProxy.deleteStrategyScript', () => {
  it('打的是那一支策略腳本自己的路徑', async () => {
    const fetchMock = vi.fn().mockResolvedValue(null)
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).deleteStrategyScript(7)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8080/strategy-scripts/7', { headers: SIGNED_IN_HEADERS, method: 'DELETE' })
  })

  it('找不到那一支時說的是找不到', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({ status: 404 })))

    await expect(new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).deleteStrategyScript(7))
      .rejects.toBeInstanceOf(StrategyScriptNotFoundError)
  })
})

describe('StrategyScriptProxy 其餘的拒絕', () => {
  it.each([
    { name: '建立', act: (proxy: StrategyScriptProxy) => proxy.createStrategyScript(writeDomainOf()) },
    { name: '改寫', act: (proxy: StrategyScriptProxy) => proxy.updateStrategyScript(writeDomainOf(7)) },
    { name: '刪除', act: (proxy: StrategyScriptProxy) => proxy.deleteStrategyScript(7) },
  ])('$name 遇到內容不合規則時原樣往上拋，不當成名稱衝突也不當成找不到', async ({ act }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(
      buildFetchError({ status: 400, message: '計算根數必須大於零' })))

    const rejection = act(new StrategyScriptProxy(BASE_URL, signedInSessionStorage()))

    await expect(rejection).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(rejection).rejects.not.toBeInstanceOf(StrategyScriptNameConflictError)
    await expect(rejection).rejects.not.toBeInstanceOf(StrategyScriptNotFoundError)
  })

  it.each([
    { name: '建立', act: (proxy: StrategyScriptProxy) => proxy.createStrategyScript(writeDomainOf()) },
    { name: '改寫', act: (proxy: StrategyScriptProxy) => proxy.updateStrategyScript(writeDomainOf(7)) },
    { name: '刪除', act: (proxy: StrategyScriptProxy) => proxy.deleteStrategyScript(7) },
  ])('$name 連不上後端時說得出來', async ({ act }) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(buildFetchError({})))

    await expect(act(new StrategyScriptProxy(BASE_URL, signedInSessionStorage()))).rejects.toBeInstanceOf(BackendUnreachableError)
  })
})

describe('StrategyScriptProxy：策略腳本記著的旋鈕', () => {
  it('存下去時把旋鈕一起送出，預設值就是畫面上那個數字', async () => {
    const fetchMock = vi.fn().mockResolvedValue(strategyScriptWireOf(1, '布林通道'))
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).createStrategyScript(new StrategyScriptWriteDomain(new StrategyScriptWriteDto(
      '布林通道',
      new StrategyScriptContentDto('sum := 0.0', 'floatList', [
        new StrategyScriptParameterDto('期數', 'lookbackCount', 20),
        new StrategyScriptParameterDto('倍數', 'number', 1.5),
      ]))))

    expect(fetchMock.mock.calls[0]![1].body.parameters).toEqual([
      { name: '期數', kind: 'lookbackCount', defaultValue: 20 },
      { name: '倍數', kind: 'number', defaultValue: 1.5 },
    ])
  })

  it('讀回來時把後端的預設值收成畫面上那個數字', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ mine: [{
      ...strategyScriptWireOf(1, '布林通道'),
      parameters: [{ name: '期數', kind: 'lookbackCount', defaultValue: 20 }],
    }], adopted: [] }))

    const { mine: strategyScripts } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(strategyScripts[0]?.parameters).toEqual([
      expect.objectContaining({ name: '期數', kind: 'lookbackCount', value: 20 }),
    ])
  })

  it.each(STRATEGY_PARAMETER_KINDS.map(kind => ({ kind })))(
    '$kind 這一種存進去讀回來還是同一種', async ({ kind }) => {
      // 這一條走過**每一種**，而不是列幾種來測：漏掉一種的後果是
      // 存好的東西讀回來換了一種種類，而那不會有任何地方報錯。
      vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ mine: [{
        ...strategyScriptWireOf(1, '布林通道'),
        parameters: [{ name: '旋鈕', kind, defaultValue: 1 }],
      }], adopted: [] }))

      const { mine: strategyScripts } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
        .listAvailableStrategyScripts()

      expect(strategyScripts[0]?.parameters[0]?.kind).toBe(kind)
    })

  it('認不得的種類一律當成數值——它不會憑空變成回看根數去多拿 K 線', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ mine: [{
      ...strategyScriptWireOf(1, '布林通道'),
      parameters: [{ name: '期數', kind: '未來才有的種類', defaultValue: 20 }],
    }], adopted: [] }))

    const { mine: strategyScripts } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(strategyScripts[0]?.parameters[0]?.kind).toBe('number')
  })

  it('後端那一支沒有旋鈕這個欄位時，收成一支都沒有', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      mine: [strategyScriptWireOf(1, '二十根均線')], adopted: [],
    }))

    const { mine: strategyScripts } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(strategyScripts[0]?.parameters).toEqual([])
  })
})

describe('StrategyScriptProxy 說出每一支吃哪一種行情', () => {
  it('讀得到後端說的行情種類；舊版後端不說時是 K 線', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      mine: [
        { ...strategyScriptWireOf(1, '費率反轉'), marketDataKind: 'contractKCandle' },
        strategyScriptWireOf(2, '舊的均線'),
      ],
      adopted: [{
        id: 3, name: '別人的', resultType: 'float', publisherEmail: 'a@example.com',
        publishedAt: '2026-09-10T08:00:00.000Z', marketDataKind: 'contractKCandle',
      }, {
        id: 4, name: '別人的舊均線', resultType: 'float', publisherEmail: 'a@example.com',
        publishedAt: '2026-09-10T08:00:00.000Z',
      }],
    }))

    const { mine, adopted } = await new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
      .listAvailableStrategyScripts()

    expect(mine.map(strategyScript => strategyScript.marketDataKind)).toEqual(['contractKCandle', 'kCandle'])
    expect(adopted.map(published => published.marketDataKind)).toEqual(['contractKCandle', 'kCandle'])
  })

  it('存一支吃合約行情的，就把那一種送出去', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ...strategyScriptWireOf(7, 'OI 背離'), marketDataKind: 'contractKCandle' })
    vi.stubGlobal('$fetch', fetchMock)

    await new StrategyScriptProxy(BASE_URL, signedInSessionStorage()).createStrategyScript(
      new StrategyScriptWriteDomain(new StrategyScriptWriteDto(
        'OI 背離', new StrategyScriptContentDto('sum := 0.0', 'float', [], 'contractKCandle'))))

    expect(fetchMock.mock.calls[0]?.[1].body.marketDataKind).toBe('contractKCandle')
  })
})
