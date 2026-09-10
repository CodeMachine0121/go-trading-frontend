import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { StrategyProxy } from '~/infrastructure/proxy/strategy-proxy'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { BacktestService } from '~/domain/service/backtest-service'
import { BacktestApplication } from '~/application/backtest-application'
import { TimeZonePreferenceProxy } from '~/infrastructure/proxy/time-zone-preference-proxy'
import { ChartLineColorPreferenceProxy } from '~/infrastructure/proxy/chart-line-color-preference-proxy'
import { StrategyParameterValuePreferenceProxy } from '~/infrastructure/proxy/strategy-parameter-value-preference-proxy'
import { AppliedChartIndicatorPreferenceProxy } from '~/infrastructure/proxy/applied-chart-indicator-preference-proxy'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { KCandleService } from '~/domain/service/k-candle-service'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { WatchlistApplication } from '~/application/watchlist-application'
import { WatchlistService } from '~/domain/service/watchlist-service'
import { WatchlistProxy } from '~/infrastructure/proxy/watchlist-proxy'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { StrategyService } from '~/domain/service/strategy-service'
import { TimeZoneService } from '~/domain/service/time-zone-service'
import { ChartIndicatorService } from '~/domain/service/chart-indicator-service'
import { BackendHealthApplication } from '~/application/backend-health-application'
import { KCandleApplication } from '~/application/k-candle-application'
import { KCandleChartApplication } from '~/application/k-candle-chart-application'
import { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { IndicatorCalculationApplication } from '~/application/indicator-calculation-application'
import { LiveKCandleApplication } from '~/application/live-k-candle-application'
import { LiveKCandleService } from '~/domain/service/live-k-candle-service'
import { LiveKCandleProxy } from '~/infrastructure/proxy/live-k-candle-proxy'
import { StrategyApplication } from '~/application/strategy-application'
import { StrategyMarketplaceProxy } from '~/infrastructure/proxy/strategy-marketplace-proxy'
import { StrategyMarketplaceService } from '~/domain/service/strategy-marketplace-service'
import { StrategyMarketplaceApplication } from '~/application/strategy-marketplace-application'
import { TimeZoneApplication } from '~/application/time-zone-application'
import { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import { AssistantConversationProxy } from '~/infrastructure/proxy/assistant-conversation-proxy'
import { AssistantConversationService } from '~/domain/service/assistant-conversation-service'
import { AssistantConversationApplication } from '~/application/assistant-conversation-application'
import { AssistantTriggerPositionPreferenceProxy } from '~/infrastructure/proxy/assistant-trigger-position-preference-proxy'
import { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'
import { AssistantTriggerApplication } from '~/application/assistant-trigger-application'
import { AssistantDrawerWidthPreferenceProxy } from '~/infrastructure/proxy/assistant-drawer-width-preference-proxy'
import { AssistantDrawerWidthService } from '~/domain/service/assistant-drawer-width-service'
import { AssistantDrawerWidthApplication } from '~/application/assistant-drawer-width-application'
import { UserProxy } from '~/infrastructure/proxy/user-proxy'
import { SessionStorageProxy } from '~/infrastructure/proxy/session-storage-proxy'
import { UserSessionService } from '~/domain/service/user-session-service'
import { UserSessionApplication } from '~/application/user-session-application'
import { ClipboardProxy } from '~/infrastructure/proxy/clipboard-proxy'
import { ClipboardService } from '~/domain/service/clipboard-service'
import { ClipboardApplication } from '~/application/clipboard-application'

/**
 * 組裝根：唯一知道所有具體型別的地方。
 * 由外而內組裝 proxy → domain service → application，並把 application provide 給元件層。
 * 元件透過 `const { $kCandleApplication } = useNuxtApp()` 取用。
 */
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const backendBaseUrl = runtimeConfig.public.backendBaseUrl

  // 記著這台瀏覽器手上那一段登入的，只此一份：每一發請求都從它取得身分，
  // 而被登出時也是它先被清掉。兩份的話，其中一份會在某個時刻是舊的答案。
  const sessionStorageProxy = new SessionStorageProxy()

  /**
   * 被登出時要做的事。
   *
   * 它在這裡只是**接線**：那件事本身住在「現在是誰在用」那一份共用狀態旁邊，因為它要清掉
   * 的正是那一份。發請求的那一層不該懂得導頁，而每一個畫面各自處理這件事，等於同一段規則
   * 寫十遍——其中一遍遲早會把「請重新登入」顯示成一般的紅字，然後使用者會去修一份從來
   * 沒錯的請求。
   */
  const onSignedOut = () => {
    void useUserSession().signOutBecauseSessionExpired()
  }

  const backendHealthApplication = new BackendHealthApplication(
    new BackendHealthService(new BackendHealthProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  const kCandleApplication = new KCandleApplication(
    new KCandleService(new KCandleProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  const kCandleChartApplication = new KCandleChartApplication(
    new KCandleChartService(new KCandleProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  const tradingSymbolApplication = new TradingSymbolApplication(
    new TradingSymbolService(new TradingSymbolProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  // 讀走的是可查交易標的那一份——觀察清單是它的子集，多開一條讀取的路
  // 只會養出兩份會漂移的答案；寫入才是它自己的。
  const watchlistApplication = new WatchlistApplication(
    new WatchlistService(
      new TradingSymbolProxy(backendBaseUrl, sessionStorageProxy, onSignedOut),
      new WatchlistProxy(backendBaseUrl, sessionStorageProxy, onSignedOut),
    ),
  )

  const indicatorCalculationApplication = new IndicatorCalculationApplication(
    new IndicatorCalculationService(new IndicatorCalculationProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  const strategyApplication = new StrategyApplication(
    new StrategyService(new StrategyProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  // 共用的那個貨架是它自己的一件事，所以它有自己的一整條線而不是塞進策略那一條：
  // 那一條回答「我的東西」，這一條回答「外面有什麼」。市集日後長出搜尋、分類或使用次數時，
  // 長的是這一條，而日常挑策略那條路一行都不會動。
  const strategyMarketplaceApplication = new StrategyMarketplaceApplication(
    new StrategyMarketplaceService(
      new StrategyMarketplaceProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
    // 它也要問「哪幾支是我的、哪幾支我收下過」，而那只有自己的清單答得出來。
    new StrategyService(new StrategyProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  // 重演一支策略是後端的另一項能力，所以它有自己的 proxy 而不是塞進算指標的那一個：
  // 兩者問的問題不同（這一批 K 線上算出什麼 vs 這一段歷史走下來會怎樣），
  // 回來的形狀也完全不同。它同樣不留存，因此這台瀏覽器上沒有任何要記住的東西。
  const backtestApplication = new BacktestApplication(
    new BacktestService(new BacktestProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  // 圖表上的指標同時要打後端（算）與碰瀏覽器儲存（記住線色、記住旋鈕調成什麼、
  // 記住圖上擺著哪幾支）——前者是行情，後三者是這台機器上的習慣，所以它吃四個 proxy。
  // 三種記憶各有各的 proxy 而不是合成一個「偏好」：它們的鍵不同、生命週期不同，
  // 回答的問題也不同（這條線什麼顏色／我習慣把這支調成幾／圖上擺著哪幾筆），
  // 合起來只會得到一個誰都不好懂的萬用儲存。
  const chartIndicatorApplication = new ChartIndicatorApplication(
    new ChartIndicatorService(
      new IndicatorCalculationProxy(backendBaseUrl, sessionStorageProxy, onSignedOut),
      new ChartLineColorPreferenceProxy(),
      new StrategyParameterValuePreferenceProxy(),
      new AppliedChartIndicatorPreferenceProxy(),
    ),
  )

  // 跟盤是一條持續連著的通道，與其他那些一次問一次答的完全不同——
  // 所以它有自己的 proxy，而不是塞進取 K 線的那一個。
  const liveKCandleApplication = new LiveKCandleApplication(
    new LiveKCandleService(new LiveKCandleProxy(backendBaseUrl)),
  )

  // 助手是後端的一項能力，因此它只吃 base URL——這台瀏覽器上沒有任何要記住的東西。
  // 「目前這段對話」活在共用的畫面狀態裡，不是留存下來的偏好。
  const assistantConversationApplication = new AssistantConversationApplication(
    new AssistantConversationService(new AssistantConversationProxy(backendBaseUrl, sessionStorageProxy, onSignedOut)),
  )

  // 那顆叫出助手的鍵擺在哪裡，是這台裝置的習慣而不是行情，所以它只碰瀏覽器儲存、
  // 不吃 base URL——與時區、線色那幾份記憶同一類。它與上面那一支分開，
  // 因為「我們正在談什麼」與「那顆鍵擺在哪」會分開改變。
  const assistantTriggerApplication = new AssistantTriggerApplication(
    new AssistantTriggerService(new AssistantTriggerPositionPreferenceProxy()),
  )

  // 抽屜拉成多寬同樣是這台裝置的習慣。它與上面那一支分開，因為「那顆鍵擺在哪」與
  // 「抽屜多寬」會分開改變——合成一個，它的公開方法會乾淨地分成兩半互不相干。
  const assistantDrawerWidthApplication = new AssistantDrawerWidthApplication(
    new AssistantDrawerWidthService(new AssistantDrawerWidthPreferenceProxy()),
  )

  // 剪貼簿是第三種外部資源（另外是後端與瀏覽器儲存），所以一樣收在 proxy 裡——
  // 元件不直接碰 navigator，理由與不直接碰 $fetch 相同。
  const clipboardApplication = new ClipboardApplication(
    new ClipboardService(new ClipboardProxy()),
  )

  // 「現在是誰在用」同時要打後端（建帳號、登入、續用、登出、我是誰）與碰瀏覽器儲存
  // （記住那一對憑證），
  // 所以它吃兩個 proxy。記憶那一側刻意是獨立的一個能力，而不是塞進打後端的那一個：
  // 憑證改記在 cookie（好讓伺服器端也判斷得出來）的那一天，換的是它，不是後端那一條。
  const userSessionApplication = new UserSessionApplication(
    new UserSessionService(
      new UserProxy(backendBaseUrl, sessionStorageProxy, onSignedOut), sessionStorageProxy),
  )

  // 時區是這台瀏覽器看資料的說法，不必問後端，因此它是唯一不吃 base URL 的那一條。
  const timeZoneApplication = new TimeZoneApplication(
    new TimeZoneService(new TimeZonePreferenceProxy()),
  )

  return {
    provide: {
      backendHealthApplication,
      kCandleApplication,
      kCandleChartApplication,
      tradingSymbolApplication,
      watchlistApplication,
      indicatorCalculationApplication,
      strategyApplication,
      strategyMarketplaceApplication,
      backtestApplication,
      chartIndicatorApplication,
      liveKCandleApplication,
      timeZoneApplication,
      assistantConversationApplication,
      assistantTriggerApplication,
      assistantDrawerWidthApplication,
      clipboardApplication,
      userSessionApplication,
    },
  }
})
