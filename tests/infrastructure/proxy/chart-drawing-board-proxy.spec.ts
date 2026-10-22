import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartDrawingBoardProxy } from '~/infrastructure/proxy/chart-drawing-board-proxy'
import { ChartDrawingBoardChangedError } from '~/domain/errors/chart-drawing-board-changed-error'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { ChartDrawing } from '~/domain/models/entities/chart-drawing'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, savedBoardOf } from '../../fixtures/chart-drawing'
import { signedInSessionStorage } from '../../fixtures/session-storage'

const BASE_URL = 'http://localhost:8080'

const assistantLineWire = {
  id: 7,
  kind: 'trendLine',
  anchors: [{ openTime: TEN_O_CLOCK, price: '61200.5' }, { openTime: ELEVEN_O_CLOCK, price: '62000' }],
  color: 'teal',
  lineWidth: 2,
  lineStyle: 'dashed',
  locked: false,
  visible: true,
  source: 'assistant',
  assistantConversationId: 12,
  assistantTurnId: 34,
}

const boardWire = (revision: number, drawings: unknown[]) => ({ market: 'spot', symbol: 'BTCUSDT', revision, drawings })

function rejection(status: number, data: Record<string, unknown>) {
  return createFetchError({
    request: BASE_URL,
    options: {},
    response: { status, statusText: 'rejected', _data: data },
  } as unknown as FetchContext)
}

function proxy() {
  return new ChartDrawingBoardProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChartDrawingBoardProxy：讀', () => {
  it('讀那一邊那一檔：精確的價格、調色盤名稱換成畫面的顏色、來源', async () => {
    const fetchMock = vi.fn().mockResolvedValue(boardWire(3, [assistantLineWire]))
    vi.stubGlobal('$fetch', fetchMock)

    const board = await proxy().fetchBoard('contract', 'ETHUSDT')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/users/me/chart-drawings/contract/ETHUSDT`)
    expect(board.revision).toBe(3)
    expect(board.marketSide).toBe('contract')
    const [drawing] = board.drawings
    expect(drawing?.id).toBe(7)
    expect(drawing?.anchors.map(anchor => anchor.price.toString())).toEqual(['61200.5', '62000'])
    expect(drawing?.anchors[0]?.openTime.toISOString()).toBe(TEN_O_CLOCK)
    expect(drawing?.colorToken).toBe('--color-drawing-teal')
    expect(drawing?.lineStyle).toBe('dashed')
    expect(drawing?.source).toBe('assistant')
  })

  it.each([
    ['手畫的', 'manual', 'manual'],
    ['認不得的來源當成手畫的', 'robot', 'manual'],
  ])('%s', async (_, sourceWire, expected) => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(boardWire(1, [{ ...assistantLineWire, source: sourceWire }])))

    expect((await proxy().fetchBoard('spot', 'BTCUSDT')).drawings[0]?.source).toBe(expected)
  })

  it('調色盤上沒有的顏色原樣交進來（由繪圖自己退回預設色）；沒有繪圖時是空的', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(boardWire(1, [{ ...assistantLineWire, color: 'gold' }])))

    const [drawing] = (await proxy().fetchBoard('spot', 'BTCUSDT')).drawings

    expect(drawing?.colorToken).toBe('gold')
    expect(drawing?.toDomain().toDto().colorToken).toBe('--color-drawing-blue')
  })

  it('帳號回來的繪圖是 null：當成沒有繪圖', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({ ...boardWire(0, []), drawings: null }))

    expect((await proxy().fetchBoard('spot', 'BTCUSDT')).drawings).toEqual([])
  })

  it('從沒存過：版本 0、沒有繪圖', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(boardWire(0, [])))

    const board = await proxy().fetchBoard('spot', 'BTCUSDT')

    expect(board.revision).toBe(0)
    expect(board.drawings).toEqual([])
  })
})

describe('ChartDrawingBoardProxy：存回', () => {
  const newLine = new ChartDrawing(-1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '60000')], '--color-drawing-indigo',
    1, 'solid', false, true)
  const keptLine = new ChartDrawing(7, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '58000')], '--color-drawing-blue',
    3, 'dotted', true, false, 'assistant')

  it('整份 PUT：帶版本、既有的帶編號、新的不帶編號；線色送調色盤名稱；不送來源', async () => {
    const fetchMock = vi.fn().mockResolvedValue(boardWire(4, []))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().saveBoard(savedBoardOf(3, [keptLine, newLine]))

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/users/me/chart-drawings/spot/BTCUSDT`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'PUT',
      body: {
        revision: 3,
        drawings: [
          { id: 7, kind: 'horizontalLine', anchors: [{ openTime: TEN_O_CLOCK, price: '58000' }], color: 'blue', lineWidth: 3, lineStyle: 'dotted', locked: true, visible: false },
          { kind: 'horizontalLine', anchors: [{ openTime: TEN_O_CLOCK, price: '60000' }], color: 'indigo', lineWidth: 1, lineStyle: 'solid', locked: false, visible: true },
        ],
      },
    })
    const sentDrawings = (fetchMock.mock.calls[0]?.[1] as { body: { drawings: Record<string, unknown>[] } }).body.drawings
    expect(sentDrawings[1]).not.toHaveProperty('id')
    expect(sentDrawings[0]).not.toHaveProperty('source')
  })

  it('奇異筆：每一點的時刻原樣送出（不必是 K 線起始時間），讀回來還是同一刻', async () => {
    const brush = new ChartDrawing(-1, 'brush', [
      anchorOf('2026-10-16T10:10:30.000Z', '60000.25'), anchorOf('2026-10-16T10:47:12.500Z', '60120'),
    ], '--color-drawing-orange', 2, 'solid', false, true)
    const brushWire = {
      id: 9, kind: 'brush', color: 'orange', lineWidth: 2, lineStyle: 'solid', locked: false, visible: true, source: 'manual',
      anchors: [{ openTime: '2026-10-16T10:10:30.000Z', price: '60000.25' }, { openTime: '2026-10-16T10:47:12.500Z', price: '60120' }],
    }
    const fetchMock = vi.fn().mockResolvedValue(boardWire(4, [brushWire]))
    vi.stubGlobal('$fetch', fetchMock)

    const saved = await proxy().saveBoard(savedBoardOf(3, [brush]))

    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ body: { drawings: [{ kind: 'brush', color: 'orange', anchors: brushWire.anchors }] } })
    expect(saved.drawings[0]?.kind).toBe('brush')
    expect(saved.drawings[0]?.colorToken).toBe('--color-drawing-orange')
    expect(saved.drawings[0]?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()]))
      .toEqual([['2026-10-16T10:10:30.000Z', '60000.25'], ['2026-10-16T10:47:12.500Z', '60120']])
  })

  it('調色盤上沒有的顏色原樣送出（交給交易服務拒絕並說明）', async () => {
    const fetchMock = vi.fn().mockResolvedValue(boardWire(4, []))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().saveBoard(savedBoardOf(3, [new ChartDrawing(-1, 'horizontalLine', [anchorOf(TEN_O_CLOCK, '1')], 'gold', 1, 'solid', false, true)]))

    expect((fetchMock.mock.calls[0]?.[1] as { body: { drawings: { color: string }[] } }).body.drawings[0]?.color).toBe('gold')
  })

  it('交回存進去的那一份', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue(boardWire(4, [{ ...assistantLineWire, id: 8 }])))

    const saved = await proxy().saveBoard(savedBoardOf(3, [newLine]))

    expect(saved.revision).toBe(4)
    expect(saved.drawings.map(drawing => drawing.id)).toEqual([8])
  })

  it('版本對不上：拋出帶著帳號現在那一份的哨兵錯誤', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(409, {
      message: 'chart drawing board changed: 繪圖板已經變了，現在是第 5 版',
      board: boardWire(5, [assistantLineWire]),
    })))

    const failure = await proxy().saveBoard(savedBoardOf(3, [newLine])).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(ChartDrawingBoardChangedError)
    expect((failure as ChartDrawingBoardChangedError).currentBoard.revision).toBe(5)
    expect((failure as ChartDrawingBoardChangedError).currentBoard.drawings[0]?.source).toBe('assistant')
  })

  it.each([
    ['驗證失敗（超過 200 個）', 400, { message: 'invalid chart drawings: 一份繪圖板最多 200 個' }],
    ['衝突但沒有附上那一份', 409, { message: 'conflict' }],
  ])('%s：照一般的拒絕往上拋，帶著交易服務的原因', async (_, status, data) => {
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(rejection(status, data)))

    const failure = await proxy().saveBoard(savedBoardOf(3, [newLine])).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(BackendRequestRejectedError)
    expect((failure as BackendRequestRejectedError).message).toBe(data.message)
  })
})

describe('ChartDrawingBoardProxy：移除助手畫的全部', () => {
  it('DELETE 那一邊那一檔的助手繪圖，交回移除了幾個', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ revision: 5, removedCount: 2, removedDrawingIds: [7, 8] })
    vi.stubGlobal('$fetch', fetchMock)

    const removedCount = await proxy().removeAssistantDrawings('contract', 'BTCUSDT')

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/users/me/chart-drawings/contract/BTCUSDT/assistant-drawings`)
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'DELETE' })
    expect(removedCount).toBe(2)
  })
})
