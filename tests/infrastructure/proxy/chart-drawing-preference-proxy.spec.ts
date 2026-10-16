import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartDrawingPreferenceProxy } from '~/infrastructure/proxy/chart-drawing-preference-proxy'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK, anchorOf, chartDrawingOf } from '../../fixtures/chart-drawing'

const STORAGE_KEY = 'go-trading:chart-drawings'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const TREND_LINE = chartDrawingOf(1, 'trendLine', [anchorOf(TEN_O_CLOCK, '60000.5'), anchorOf(ELEVEN_O_CLOCK, '61000')])

describe('ChartDrawingPreferenceProxy：每一邊每一檔的繪圖記得住', () => {
  it('寫進現貨 BTCUSDT 的讀得回來：時間與精確的價格都在', () => {
    const proxy = new ChartDrawingPreferenceProxy()

    proxy.writeChartDrawings('spot', 'BTCUSDT', [TREND_LINE])
    const [read] = proxy.readChartDrawings('spot', 'BTCUSDT')

    expect(read?.kind).toBe('trendLine')
    expect(read?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()])).toEqual([
      [TEN_O_CLOCK, '60000.5'], [ELEVEN_O_CLOCK, '61000'],
    ])
  })

  it('合約 BTCUSDT 與現貨分開；別檔也分開', () => {
    const proxy = new ChartDrawingPreferenceProxy()

    proxy.writeChartDrawings('spot', 'BTCUSDT', [TREND_LINE])

    expect(proxy.readChartDrawings('contract', 'BTCUSDT')).toEqual([])
    expect(proxy.readChartDrawings('spot', 'ETHUSDT')).toEqual([])
  })

  it('寫一檔不會蓋掉另一檔', () => {
    const proxy = new ChartDrawingPreferenceProxy()

    proxy.writeChartDrawings('spot', 'BTCUSDT', [TREND_LINE])
    proxy.writeChartDrawings('spot', 'ETHUSDT', [TREND_LINE])

    expect(proxy.readChartDrawings('spot', 'BTCUSDT')).toHaveLength(1)
  })

  it('瀏覽器擋掉儲存：讀回空的、寫不出聲', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    const proxy = new ChartDrawingPreferenceProxy()

    expect(() => proxy.writeChartDrawings('spot', 'BTCUSDT', [TREND_LINE])).not.toThrow()
    expect(proxy.readChartDrawings('spot', 'BTCUSDT')).toEqual([])
  })

  it.each([
    ['不是 JSON', 'not json'],
    ['是一個陣列', '[]'],
    ['那一檔不是陣列', JSON.stringify({ 'spot:BTCUSDT': 'oops' })],
  ])('留存%s：當成沒畫過', (_, stored) => {
    localStorage.setItem(STORAGE_KEY, stored)

    expect(new ChartDrawingPreferenceProxy().readChartDrawings('spot', 'BTCUSDT')).toEqual([])
  })

  it('壞掉的那幾筆跳過，其餘照樣回來', () => {
    const good = { id: 1, kind: 'horizontalLine', anchors: [{ openTime: TEN_O_CLOCK, price: '1' }], colorToken: '--color-drawing-blue', lineWidth: 1, lineStyle: 'solid', locked: false, visible: true }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      'spot:BTCUSDT': [
        good,
        null,
        { ...good, id: 'x' },
        { ...good, kind: 'spiral' },
        { ...good, lineStyle: 'wavy' },
        { ...good, anchors: [{ openTime: 'never', price: '1' }] },
        { ...good, anchors: [{ openTime: TEN_O_CLOCK, price: 'abc' }] },
        { ...good, anchors: [null] },
        { ...good, anchors: [{ openTime: 5, price: '1' }] },
        // 趨勢線要兩個點，只有一個畫不出來
        { ...good, kind: 'trendLine' },
      ],
    }))

    expect(new ChartDrawingPreferenceProxy().readChartDrawings('spot', 'BTCUSDT').map(drawing => drawing.id)).toEqual([1])
  })
})
