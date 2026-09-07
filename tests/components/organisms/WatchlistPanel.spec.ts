import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import WatchlistPanel from '~/components/organisms/WatchlistPanel.vue'
import { WatchlistApplication } from '~/application/watchlist-application'
import { WatchlistService } from '~/domain/service/watchlist-service'
import type { ITradingSymbolProxy } from '~/domain/interface/i-trading-symbol-proxy'
import type { IWatchlistProxy } from '~/domain/interface/i-watchlist-proxy'
import { TradingSymbolNotInMarketError } from '~/domain/errors/trading-symbol-not-in-market-error'
import { MarketDataSourceUnavailableError } from '~/domain/errors/market-data-source-unavailable-error'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'
import { buildTradingSymbol } from '../../fixtures/trading-symbol-application'

// 只 mock 最外層的兩個 proxy；application、domain service 與 entity 都是真的。
async function mountPanel(
  watchlistProxy: Partial<IWatchlistProxy> = {},
  tradingSymbolProxy: Partial<ITradingSymbolProxy> = {},
) {
  const wrapper = mount(WatchlistPanel, {
    props: {
      watchlistApplication: new WatchlistApplication(new WatchlistService(
        {
          findTradingSymbols: vi.fn().mockResolvedValue([
            buildTradingSymbol('2330', { market: 'taiwanStock', isWatched: true }),
            buildTradingSymbol('2454', {
              market: 'taiwanStock', isWatched: true, hasLiveUpdates: false,
            }),
            buildTradingSymbol('XRPUSDT', { isWatched: false }),
          ]),
          ...tradingSymbolProxy,
        },
        {
          addToWatchlist: vi.fn().mockResolvedValue(undefined),
          removeFromWatchlist: vi.fn().mockResolvedValue(undefined),
          ...watchlistProxy,
        },
      )),
    },
  })
  await flushPromises()

  return wrapper
}

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountPanel>>, symbol: string,
) {
  await wrapper.find('[data-testid="watchlist-symbol"]').setValue(symbol)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

/** 確認對話框上的按鈕以它說的話指名——它沒有自己的測試識別字。 */
async function clickButtonSaying(
  wrapper: Awaited<ReturnType<typeof mountPanel>>, label: string,
) {
  await wrapper.findAll('button')
    .filter(button => button.text() === label)[0]?.trigger('click')
}

describe('WatchlistPanel 列出追蹤中的', () => {
  it('只列出追蹤中的那幾檔', async () => {
    // 不追蹤的標的仍然挑得到（它的 K 線還在），但它不在這一頁上。
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('2330')
    expect(wrapper.text()).not.toContain('XRPUSDT')
  })

  it('每一檔唸得出公司的名字，不是只有四位數字', async () => {
    const wrapper = await mountPanel({}, {
      findTradingSymbols: vi.fn().mockResolvedValue([
        buildTradingSymbol('2330', {
          market: 'taiwanStock', isWatched: true, displayName: '台積電',
        }),
      ]),
    })

    expect(wrapper.text()).toContain('2330 台積電')
  })

  it('每一檔說得出市場與有沒有即時更新', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('台股')
    expect(wrapper.text()).toContain('無即時更新')
  })

  it('一檔都沒有時說明目前沒有追蹤任何標的，而不是呈現成錯誤', async () => {
    const wrapper = await mountPanel({}, {
      findTradingSymbols: vi.fn().mockResolvedValue([]),
    })

    expect(wrapper.find('[data-testid="watchlist-empty"]').exists()).toBe(true)
  })

  it('取不到清單時說的是取不到，不是「目前沒有追蹤任何標的」', async () => {
    // 那兩句話對使用者的意思完全不同：一句要他去把後端啟動起來，一句要他加一檔進來。
    const wrapper = await mountPanel({}, {
      findTradingSymbols: vi.fn().mockRejectedValue(new BackendUnreachableError('連不上')),
    })

    expect(wrapper.find('[data-testid="watchlist-unavailable-alert"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="watchlist-empty"]').exists()).toBe(false)
  })

  it('說得出改動不是立刻生效的', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain('最多等一輪')
  })
})

describe('WatchlistPanel 加一檔進來', () => {
  it('把市場與代號一起送出，成功後清單立刻跟著變', async () => {
    const addToWatchlist = vi.fn().mockResolvedValue(undefined)
    const findTradingSymbols = vi.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([buildTradingSymbol('2330', {
        market: 'taiwanStock', isWatched: true,
      })])
    const wrapper = await mountPanel({ addToWatchlist }, { findTradingSymbols })

    await fillAndSubmit(wrapper, '2330')

    expect(addToWatchlist).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: '2330', market: 'taiwanStock' }))
    expect(wrapper.text()).toContain('2330')
  })

  it('代號前後的空白不算數', async () => {
    const addToWatchlist = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ addToWatchlist })

    await fillAndSubmit(wrapper, '  2330  ')

    expect(addToWatchlist).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: '2330' }))
  })

  it('代號空白就地擋下，不向後端送出任何東西', async () => {
    // 付一趟往返來發現什麼都沒填，是白付的。
    const addToWatchlist = vi.fn()
    const wrapper = await mountPanel({ addToWatchlist })

    await fillAndSubmit(wrapper, '   ')

    expect(addToWatchlist).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('請填入代號')
  })

  it('代號在那個市場找不到時，說的是請他改輸入', async () => {
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockRejectedValue(
        new TradingSymbolNotInMarketError('9999 在 taiwanStock 找不到這個代號')),
    })

    await fillAndSubmit(wrapper, '9999')

    expect(wrapper.text()).toContain('找不到')
    expect(wrapper.text()).not.toContain('稍後再試')
  })

  it('後端問不到那個市場時，說的是稍後再試，而且明說與代號無關', async () => {
    // 兩句話對使用者的下一步完全相反：一個改輸入，一個等一下。
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockRejectedValue(
        new MarketDataSourceUnavailableError('問不到台股')),
    })

    await fillAndSubmit(wrapper, '2330')

    expect(wrapper.text()).toContain('稍後再試')
    expect(wrapper.text()).toContain('與代號對不對無關')
  })

  it('說明擠不進代號那一欄，所以它自己一整列', async () => {
    // 擠進去的話它會把那一欄撐高，整排跟著被拉開，市場選單與按鈕就與輸入框錯開。
    // 這幾句本來就長，窄欄位裝不下。
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockRejectedValue(
        new MarketDataSourceUnavailableError('問不到台股')),
    })

    await fillAndSubmit(wrapper, '2330')

    expect(wrapper.get('[data-testid="field-error"]').text()).toContain('稍後再試')
    // FormField 用一個 <label> 把整欄包起來；訊息若在裡面，就是它把那一欄撐高的。
    expect(wrapper.findAll('label [data-testid="field-error"]')).toHaveLength(0)
  })
})

describe('WatchlistPanel 把一檔拿掉', () => {
  it('移除前先確認，而且確認訊息說得出 K 線都會留著', async () => {
    // 「移除」在直覺上很接近「刪除」。不講清楚，使用者不敢按。
    const removeFromWatchlist = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ removeFromWatchlist })

    await wrapper.find('[data-testid="watchlist-remove-2330"]').trigger('click')

    expect(wrapper.text()).toContain('都會留著')
    expect(removeFromWatchlist).not.toHaveBeenCalled()
  })

  it('確認之後才真的送出', async () => {
    const removeFromWatchlist = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ removeFromWatchlist })
    await wrapper.find('[data-testid="watchlist-remove-2330"]').trigger('click')

    await clickButtonSaying(wrapper, '停止追蹤')
    await flushPromises()

    expect(removeFromWatchlist).toHaveBeenCalledWith('2330')
  })

  it('取消就什麼都沒發生', async () => {
    const removeFromWatchlist = vi.fn()
    const wrapper = await mountPanel({ removeFromWatchlist })
    await wrapper.find('[data-testid="watchlist-remove-2330"]').trigger('click')

    await clickButtonSaying(wrapper, '取消')

    expect(removeFromWatchlist).not.toHaveBeenCalled()
  })
})

describe('WatchlistPanel 其餘的失敗與狀態', () => {
  it('說不出是哪一種的失敗，就把後端說的話原樣轉達', async () => {
    // 猜一個原因給使用者，比轉達一句他看得懂的話糟。
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockRejectedValue(new Error('後端說了一句別的')),
    })

    await fillAndSubmit(wrapper, '2330')

    expect(wrapper.text()).toContain('後端說了一句別的')
  })

  it('送出期間按鍵停用，按不出第二次', async () => {
    let release: () => void = () => {}
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          release = resolve
        })),
    })

    await wrapper.find('[data-testid="watchlist-symbol"]').setValue('2330')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.find('[data-testid="watchlist-add"]').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('確認中…')
    release()
    await flushPromises()
  })

  it('清單還沒回來時說的是取清單中，不是「目前沒有任何標的」', async () => {
    // 那句話會讓人以為清單是空的，然後去加一檔他其實已經在追蹤的股票。
    const wrapper = mount(WatchlistPanel, {
      props: {
        watchlistApplication: new WatchlistApplication(new WatchlistService(
          { findTradingSymbols: vi.fn().mockImplementation(() => new Promise(() => {})) },
          {
            addToWatchlist: vi.fn(),
            removeFromWatchlist: vi.fn(),
          },
        )),
      },
    })

    expect(wrapper.text()).toContain('取觀察清單中…')
    expect(wrapper.find('[data-testid="watchlist-empty"]').exists()).toBe(false)
  })
})

describe('WatchlistPanel 加進來的是哪個市場', () => {
  it('市場跟著代號一起送出，而不是永遠送同一個', async () => {
    // 同樣的幾個數字在不同市場可能是不同的東西，系統不從代號長相猜市場。
    const addToWatchlist = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ addToWatchlist })

    await wrapper.find('[data-testid="watchlist-market"]').setValue('crypto')
    await fillAndSubmit(wrapper, 'BTCUSDT')

    expect(addToWatchlist).toHaveBeenCalledWith(
      expect.objectContaining({ symbol: 'BTCUSDT', market: 'crypto' }))
  })

  it('後端丟出來的不是一個錯誤物件時，仍然說得出加入失敗', async () => {
    const wrapper = await mountPanel({
      addToWatchlist: vi.fn().mockRejectedValue('說不清楚的東西'),
    })

    await fillAndSubmit(wrapper, '2330')

    expect(wrapper.text()).toContain('加入失敗')
  })
})
