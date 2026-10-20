import { afterEach, describe, expect, it, vi } from 'vitest'
import { DeviceChartDrawingProxy } from '~/infrastructure/proxy/device-chart-drawing-proxy'
import { ELEVEN_O_CLOCK, TEN_O_CLOCK } from '../../fixtures/chart-drawing'

const STORAGE_KEY = 'go-trading:chart-drawings'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const storedTrendLine = { id: 1, kind: 'trendLine', anchors: [{ openTime: TEN_O_CLOCK, price: '60000.5' }, { openTime: ELEVEN_O_CLOCK, price: '61000' }], colorToken: '--color-drawing-blue', lineWidth: 2, lineStyle: 'solid', locked: false, visible: true }

function storeOldDrawings(byBoard: Record<string, unknown[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(byBoard))
}

describe('DeviceChartDrawingProxy：這台裝置上的舊繪圖', () => {
  it('讀得出現貨 BTCUSDT 的舊繪圖：時間與精確的價格都在', () => {
    storeOldDrawings({ 'spot:BTCUSDT': [storedTrendLine] })

    const [read] = new DeviceChartDrawingProxy().readChartDrawings('spot', 'BTCUSDT')

    expect(read?.kind).toBe('trendLine')
    expect(read?.anchors.map(anchor => [anchor.openTime.toISOString(), anchor.price.toString()])).toEqual([
      [TEN_O_CLOCK, '60000.5'], [ELEVEN_O_CLOCK, '61000'],
    ])
  })

  it('合約 BTCUSDT 與現貨分開；別檔也分開', () => {
    storeOldDrawings({ 'spot:BTCUSDT': [storedTrendLine] })
    const proxy = new DeviceChartDrawingProxy()

    expect(proxy.readChartDrawings('contract', 'BTCUSDT')).toEqual([])
    expect(proxy.readChartDrawings('spot', 'ETHUSDT')).toEqual([])
  })

  it('忘掉一檔：只忘那一邊那一檔，其他照樣記著', () => {
    storeOldDrawings({ 'spot:BTCUSDT': [storedTrendLine], 'contract:BTCUSDT': [storedTrendLine] })
    const proxy = new DeviceChartDrawingProxy()

    proxy.forgetChartDrawings('spot', 'BTCUSDT')

    expect(proxy.readChartDrawings('spot', 'BTCUSDT')).toEqual([])
    expect(proxy.readChartDrawings('contract', 'BTCUSDT')).toHaveLength(1)
  })

  it('瀏覽器擋掉儲存：讀回空的、忘不掉不出聲', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
    })
    const proxy = new DeviceChartDrawingProxy()

    expect(() => proxy.forgetChartDrawings('spot', 'BTCUSDT')).not.toThrow()
    expect(proxy.readChartDrawings('spot', 'BTCUSDT')).toEqual([])
  })

  it.each([
    ['不是 JSON', 'not json'],
    ['是一個陣列', '[]'],
    ['那一檔不是陣列', JSON.stringify({ 'spot:BTCUSDT': 'oops' })],
  ])('留存%s：當成沒畫過', (_, stored) => {
    localStorage.setItem(STORAGE_KEY, stored)

    expect(new DeviceChartDrawingProxy().readChartDrawings('spot', 'BTCUSDT')).toEqual([])
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

    expect(new DeviceChartDrawingProxy().readChartDrawings('spot', 'BTCUSDT').map(drawing => drawing.id)).toEqual([1])
  })
})
