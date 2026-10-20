// @vitest-environment nuxt
import { effectScope, nextTick, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { IChartDrawingBoardProxy } from '~/domain/interface/i-chart-drawing-board-proxy'
import type { IDeviceChartDrawingProxy } from '~/domain/interface/i-device-chart-drawing-proxy'
import type { ChartDrawingBoard } from '~/domain/models/entities/chart-drawing-board'
import { ChartDrawingCommandDto } from '~/domain/models/dto/chart-drawing-command-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { ChartDrawingBoardChangedError } from '~/domain/errors/chart-drawing-board-changed-error'
import {
  CHART_DRAWING_CONFLICT_RETRY_LIMIT,
  CHART_DRAWING_SAVE_DELAY_MILLISECONDS,
} from '~/composables/use-chart-drawing-board-sync'
import { TEN_O_CLOCK, anchorOf, horizontalLineAt, savedBoardOf } from '../fixtures/chart-drawing'
import {
  FIRST_ISSUED_DRAWING_ID, buildChartDrawingApplication, chartDrawingBoardProxyOf, deviceChartDrawingProxyOf,
} from '../fixtures/chart-drawing-application'

const scopes: ReturnType<typeof effectScope>[] = []

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
})

afterEach(() => {
  scopes.splice(0).forEach(scope => scope.stop())
  vi.useRealTimers()
})

const unreachable = () => new BackendUnreachableError('http://localhost:8080', {
  cause: createFetchError({ request: 'x', options: {} } as unknown as FetchContext),
})

function syncUnderTest(
  boardProxy: IChartDrawingBoardProxy = chartDrawingBoardProxyOf(),
  deviceProxy: IDeviceChartDrawingProxy = deviceChartDrawingProxyOf(),
) {
  const application = buildChartDrawingApplication(boardProxy, deviceProxy)
  const symbol = ref('BTCUSDT')
  const refreshSignal = ref(0)
  const scope = effectScope()
  scopes.push(scope)
  const sync = scope.run(() => useChartDrawingBoardSync(application, 'spot', symbol, refreshSignal))!

  function drawLineAt(price: string) {
    sync.replaceBoard(application.addDrawing(sync.board.value,
      application.draftDrawing('horizontalLine', [anchorOf(TEN_O_CLOCK, price)])))
  }

  function toggleLockOf(id: number) {
    sync.replaceBoard(application.changeDrawing(sync.board.value, id, new ChartDrawingCommandDto('toggleLocked')))
  }

  return { sync, application, symbol, refreshSignal, boardProxy, deviceProxy, drawLineAt, toggleLockOf, scope }
}

async function settle() {
  await flushPromises()
  await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS)
  await flushPromises()
}

const pricesOn = (board: { drawings: readonly { id: number, anchors: readonly { price: { toString: () => string } }[] }[] }) =>
  board.drawings.map(drawing => drawing.anchors[0]?.price.toString())

describe('useChartDrawingBoardSync：打開一檔', () => {
  it('帶出帳號裡那一份', async () => {
    const { sync } = syncUnderTest(chartDrawingBoardProxyOf(savedBoardOf(3, [horizontalLineAt(7, '60000')])))

    await flushPromises()

    expect(pricesOn(sync.board.value)).toEqual(['60000'])
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
  })

  it('帳號從沒存過、這台裝置也沒有：沒有繪圖、不提示', async () => {
    const { sync } = syncUnderTest()

    await flushPromises()

    expect(sync.board.value.drawings).toEqual([])
    expect(sync.announcement.value).toBeNull()
  })

  it('讀回來之前先畫的不會被蓋掉，兩者都存進帳號', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(3, [horizontalLineAt(7, '60000')]))
    const { sync, drawLineAt } = syncUnderTest(boardProxy)

    drawLineAt('50000')
    await settle()

    expect(pricesOn(sync.board.value)).toEqual(['50000', '60000'])
    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].revision).toBe(3)
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
  })

  it('讀不到：說明原因、照樣可以畫；重試成功後說明消失', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(2, [horizontalLineAt(7, '60000')]))
    vi.mocked(boardProxy.fetchBoard).mockRejectedValueOnce(unreachable())
    const { sync } = syncUnderTest(boardProxy)
    await flushPromises()

    expect(sync.loadFailure.value?.traditionalChinese).toContain('讀不到存在帳號裡的繪圖')

    await sync.refresh()

    expect(sync.loadFailure.value).toBeNull()
    expect(pricesOn(sync.board.value)).toEqual(['60000'])
  })

  it('沒有翻譯的錯誤：照原文說', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.fetchBoard).mockRejectedValueOnce(new Error('boom'))
    const { sync } = syncUnderTest(boardProxy)

    await flushPromises()

    expect(sync.loadFailure.value?.traditionalChinese).toContain('boom')
  })

  it('從沒存過、這台裝置有 3 個舊繪圖：搬進帳號並提示', async () => {
    const { sync } = syncUnderTest(chartDrawingBoardProxyOf(),
      deviceChartDrawingProxyOf([horizontalLineAt(1, '1'), horizontalLineAt(2, '2'), horizontalLineAt(3, '3')]))

    await flushPromises()

    expect(sync.board.value.drawings.map(drawing => drawing.id))
      .toEqual([FIRST_ISSUED_DRAWING_ID, FIRST_ISSUED_DRAWING_ID + 1, FIRST_ISSUED_DRAWING_ID + 2])
    expect(sync.announcement.value?.traditionalChinese).toBe('已把這台裝置上的 3 個繪圖存到帳號')
  })

  it('搬的時候連不上：說明這一次沒搬成', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(unreachable())
    const { sync } = syncUnderTest(boardProxy, deviceChartDrawingProxyOf([horizontalLineAt(1, '1')]))

    await flushPromises()

    expect(sync.migrationFailure.value?.traditionalChinese).toContain('沒能把這台裝置上的舊繪圖存到帳號')
    expect(sync.board.value.drawings).toEqual([])
  })
})

describe('useChartDrawingBoardSync：讀不到時畫的', () => {
  it('讀不到、存也存不進去；重讀成功之後接上帳號那一份並自己存回', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(2, [horizontalLineAt(7, '60000')]))
    vi.mocked(boardProxy.fetchBoard).mockRejectedValueOnce(unreachable())
    const saveAsUsual = vi.mocked(boardProxy.saveBoard).getMockImplementation()!
    vi.mocked(boardProxy.saveBoard).mockRejectedValueOnce(unreachable()).mockImplementation(saveAsUsual)
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    drawLineAt('50000')
    await settle()
    expect(sync.saveFailure.value).not.toBeNull()

    await sync.refresh()
    await settle()

    expect(pricesOn(sync.board.value)).toEqual(['50000', '60000'])
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
    expect(sync.saveFailure.value).toBeNull()
  })

  it('讀到一半換了一檔：讀回來的那一份不套到新的那一檔上', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const pending: ((board: ChartDrawingBoard) => void)[] = []
    vi.mocked(boardProxy.fetchBoard)
      .mockImplementationOnce(() => new Promise((resolve) => {
        pending.push(resolve)
      }))
      .mockImplementation(async (marketSide, symbol) => savedBoardOf(0, [], marketSide, symbol))
    const { sync, symbol } = syncUnderTest(boardProxy)

    symbol.value = 'ETHUSDT'
    await nextTick()
    pending[0]?.(savedBoardOf(9, [horizontalLineAt(1, '60000')]))
    await flushPromises()

    expect(sync.board.value.symbol).toBe('ETHUSDT')
    expect(sync.board.value.drawings).toEqual([])
  })
})

describe('useChartDrawingBoardSync：存回', () => {
  it('還在等著存時按重試：馬上存、不再等', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await sync.retrySave()
    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS)

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
  })

  it('做完一步不立刻存；等一下才存一次', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS - 1)
    expect(boardProxy.saveBoard).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
  })

  it('很快連做三步：只存一次，存的是最後的樣子', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, [horizontalLineAt(1, '60000')]))
    const { toggleLockOf } = syncUnderTest(boardProxy)
    await flushPromises()

    toggleLockOf(1)
    toggleLockOf(1)
    toggleLockOf(1)
    await settle()

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].drawings[0]?.locked).toBe(true)
  })

  it('什麼都沒改（上一步回到存過的樣子）：不存', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(1, [horizontalLineAt(1, '60000')]))
    const { sync, application, toggleLockOf } = syncUnderTest(boardProxy)
    await flushPromises()

    toggleLockOf(1)
    sync.replaceBoard(application.undo(sync.board.value))
    await settle()

    expect(boardProxy.saveBoard).not.toHaveBeenCalled()
  })

  it('存不進去：畫的留著並說明；重試成功後說明消失', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.saveBoard).mockRejectedValueOnce(unreachable())

    drawLineAt('60000')
    await settle()

    expect(pricesOn(sync.board.value)).toEqual(['60000'])
    expect(sync.saveFailure.value?.traditionalChinese).toContain('繪圖沒能存到帳號')

    await sync.retrySave()

    expect(sync.saveFailure.value).toBeNull()
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
  })

  it('說不出原因的失敗：說「發生未預期的錯誤」', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.saveBoard).mockRejectedValueOnce('nothing to say')

    drawLineAt('60000')
    await settle()

    expect(sync.saveFailure.value?.traditionalChinese).toContain('發生未預期的錯誤')
  })

  it('存不進去之後再畫一條：兩條都存進去', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.saveBoard).mockRejectedValueOnce(unreachable())
    drawLineAt('60000')
    await settle()

    drawLineAt('61000')
    await settle()

    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].drawings).toHaveLength(2)
    expect(sync.saveFailure.value).toBeNull()
  })

  it('存不進去之後不會自己一直重試', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.saveBoard).mockRejectedValue(unreachable())
    const { drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await settle()
    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS * 5)

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
  })

  it('存回途中又做了一步：存完再存一次', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS)
    drawLineAt('61000')
    await settle()

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(2)
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
    expect(sync.board.value.savedBoard.revision).toBe(2)
  })
})

describe('useChartDrawingBoardSync：帳號那一份在別處改過', () => {
  it('助手剛畫了線、這裡又畫一條：接上之後兩條都存進去，並提示', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const saveAsUsual = vi.mocked(boardProxy.saveBoard).getMockImplementation()!
    vi.mocked(boardProxy.saveBoard)
      .mockRejectedValueOnce(new ChartDrawingBoardChangedError('changed', savedBoardOf(1, [horizontalLineAt(9, '58000', 'assistant')])))
      .mockImplementation(saveAsUsual)
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await settle()

    expect(pricesOn(sync.board.value)).toEqual(['60000', '58000'])
    expect(vi.mocked(boardProxy.saveBoard).mock.lastCall?.[0].revision).toBe(1)
    expect(sync.board.value.hasUnsavedChanges).toBe(false)
    expect(sync.board.value.canUndo).toBe(false)
    expect(sync.announcement.value?.traditionalChinese).toBe('繪圖在別處改過，已接上最新的一份')
  })

  it(`連續 ${CHART_DRAWING_CONFLICT_RETRY_LIMIT} 次都接不上：停下來說明，繪圖照樣在`, async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const revisions = { next: 1 }
    vi.mocked(boardProxy.saveBoard).mockImplementation(async () => {
      throw new ChartDrawingBoardChangedError('changed',
        savedBoardOf(revisions.next++, [horizontalLineAt(9, '58000', 'assistant')]))
    })
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    await settle()

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(CHART_DRAWING_CONFLICT_RETRY_LIMIT)
    expect(sync.saveFailure.value?.traditionalChinese).toContain('一直在改')
    expect(pricesOn(sync.board.value)).toEqual(['60000', '58000'])
  })
})

describe('useChartDrawingBoardSync：重讀', () => {
  it('外部訊號（助手答完一則）：重讀，出現助手畫的線', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, refreshSignal } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.fetchBoard).mockResolvedValue(savedBoardOf(1, [horizontalLineAt(9, '58000', 'assistant')]))

    refreshSignal.value += 1
    await nextTick()
    await flushPromises()

    expect(sync.board.value.assistantDrawingCount).toBe(1)
  })

  it.each([
    ['切回這個視窗', () => window.dispatchEvent(new Event('focus'))],
    ['分頁回到看得見', () => document.dispatchEvent(new Event('visibilitychange'))],
  ])('%s：重讀', async (_, trigger) => {
    const boardProxy = chartDrawingBoardProxyOf()
    syncUnderTest(boardProxy)
    await flushPromises()

    trigger()
    await flushPromises()

    expect(boardProxy.fetchBoard).toHaveBeenCalledTimes(2)
  })

  it('分頁被切走（看不見）：不重讀', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    syncUnderTest(boardProxy)
    await flushPromises()
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')

    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()
    visibility.mockRestore()

    expect(boardProxy.fetchBoard).toHaveBeenCalledTimes(1)
  })

  it('帳號那一份沒變：什麼都不動，上一步仍可按', async () => {
    const stored = savedBoardOf(1, [horizontalLineAt(1, '60000')])
    const { sync, toggleLockOf } = syncUnderTest(chartDrawingBoardProxyOf(stored))
    await flushPromises()
    toggleLockOf(1)
    await settle()
    const before = sync.board.value

    await sync.refresh()

    expect(sync.board.value).toStrictEqual(before)
    expect(sync.board.value.canUndo).toBe(true)
  })

  it('存回還在路上時重讀：等存完才讀', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    const order: string[] = []
    const saveAsUsual = vi.mocked(boardProxy.saveBoard).getMockImplementation()!
    vi.mocked(boardProxy.saveBoard).mockImplementation(async (board) => {
      order.push('save')
      return saveAsUsual(board)
    })
    vi.mocked(boardProxy.fetchBoard).mockImplementation(async () => {
      order.push('fetch')
      return savedBoardOf(1, [horizontalLineAt(FIRST_ISSUED_DRAWING_ID, '60000')])
    })

    drawLineAt('60000')
    await vi.advanceTimersByTimeAsync(CHART_DRAWING_SAVE_DELAY_MILLISECONDS)
    void sync.refresh()
    await flushPromises()

    expect(order).toEqual(['save', 'fetch'])
    expect(sync.board.value.drawings.map(drawing => drawing.id)).toEqual([FIRST_ISSUED_DRAWING_ID])
  })

  it('連著兩個重讀的時機：還沒開始的那一次不重複排', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync } = syncUnderTest(boardProxy)

    void sync.refresh()
    void sync.refresh()
    await flushPromises()

    expect(boardProxy.fetchBoard).toHaveBeenCalledTimes(1)
  })
})

describe('useChartDrawingBoardSync：移除助手畫的全部', () => {
  it('移除之後提示幾個並重讀', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(3, [
      horizontalLineAt(1, '1'), horizontalLineAt(2, '2', 'assistant'), horizontalLineAt(3, '3', 'assistant')]))
    const { sync } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.removeAssistantDrawings).mockResolvedValue(2)
    vi.mocked(boardProxy.fetchBoard).mockResolvedValue(savedBoardOf(4, [horizontalLineAt(1, '1')]))

    await sync.removeAssistantDrawings()

    expect(boardProxy.removeAssistantDrawings).toHaveBeenCalledWith('spot', 'BTCUSDT')
    expect(sync.announcement.value?.traditionalChinese).toBe('已移除 2 個助手畫的繪圖')
    expect(pricesOn(sync.board.value)).toEqual(['1'])
    expect(sync.board.value.canUndo).toBe(false)
  })

  it('移除失敗：說明原因，繪圖都還在', async () => {
    const boardProxy = chartDrawingBoardProxyOf(savedBoardOf(3, [horizontalLineAt(2, '2', 'assistant')]))
    const { sync } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.removeAssistantDrawings).mockRejectedValue(unreachable())

    await sync.removeAssistantDrawings()

    expect(sync.announcement.value?.traditionalChinese).toContain('沒能移除助手畫的繪圖')
    expect(sync.board.value.assistantDrawingCount).toBe(1)
    expect(boardProxy.fetchBoard).toHaveBeenCalledTimes(1)
  })
})

describe('useChartDrawingBoardSync：換一檔與離開', () => {
  it('換檔時舊檔還沒存的照樣送出，結果不套到新的那一檔', async () => {
    const storedBySymbol: Record<string, ChartDrawingBoard> = {
      ETHUSDT: savedBoardOf(5, [horizontalLineAt(50, '3000')], 'spot', 'ETHUSDT'),
    }
    const boardProxy = chartDrawingBoardProxyOf()
    vi.mocked(boardProxy.fetchBoard).mockImplementation(async (marketSide, symbol) =>
      storedBySymbol[symbol] ?? savedBoardOf(0, [], marketSide, symbol))
    const { sync, symbol, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    symbol.value = 'ETHUSDT'
    await nextTick()
    await settle()

    expect(vi.mocked(boardProxy.saveBoard).mock.calls[0]?.[0].symbol).toBe('BTCUSDT')
    expect(sync.board.value.symbol).toBe('ETHUSDT')
    expect(pricesOn(sync.board.value)).toEqual(['3000'])
    expect(sync.board.value.canUndo).toBe(false)
  })

  it('換檔前那一檔存不進去：不在新的那一檔上說', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { sync, symbol, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()
    vi.mocked(boardProxy.saveBoard).mockRejectedValueOnce(unreachable())

    drawLineAt('60000')
    symbol.value = 'ETHUSDT'
    await nextTick()
    await settle()

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
    expect(sync.saveFailure.value).toBeNull()
  })

  it('讀到一半換了一檔、那一次又讀不到：不在新的那一檔上說', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const pending: ((reason: unknown) => void)[] = []
    vi.mocked(boardProxy.fetchBoard)
      .mockImplementationOnce(() => new Promise((_, reject) => {
        pending.push(reject)
      }))
      .mockImplementation(async (marketSide, symbol) => savedBoardOf(0, [], marketSide, symbol))
    const { sync, symbol } = syncUnderTest(boardProxy)

    symbol.value = 'ETHUSDT'
    await nextTick()
    pending[0]?.(unreachable())
    await flushPromises()

    expect(sync.loadFailure.value).toBeNull()
  })

  it('離開畫面時還沒存的照樣送出', async () => {
    const boardProxy = chartDrawingBoardProxyOf()
    const { scope, drawLineAt } = syncUnderTest(boardProxy)
    await flushPromises()

    drawLineAt('60000')
    scope.stop()
    await flushPromises()

    expect(boardProxy.saveBoard).toHaveBeenCalledTimes(1)
  })
})
