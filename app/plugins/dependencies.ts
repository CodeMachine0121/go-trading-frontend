import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { StrategyScriptProxy } from '~/infrastructure/proxy/strategy-script-proxy'
import { StrategyBotProxy } from '~/infrastructure/proxy/strategy-bot-proxy'
import { TradingStrategyProxy } from '~/infrastructure/proxy/trading-strategy-proxy'
import { BacktestProxy } from '~/infrastructure/proxy/backtest-proxy'
import { BacktestService } from '~/domain/service/backtest-service'
import { BacktestApplication } from '~/application/backtest-application'
import { TimeZonePreferenceProxy } from '~/infrastructure/proxy/time-zone-preference-proxy'
import { ChartLineColorPreferenceProxy } from '~/infrastructure/proxy/chart-line-color-preference-proxy'
import { StrategyScriptParameterValuePreferenceProxy } from '~/infrastructure/proxy/strategy-script-parameter-value-preference-proxy'
import { AppliedChartIndicatorPreferenceProxy } from '~/infrastructure/proxy/applied-chart-indicator-preference-proxy'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { KCandleService } from '~/domain/service/k-candle-service'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
import { IndicatorCalculationService } from '~/domain/service/indicator-calculation-service'
import { StrategyScriptService } from '~/domain/service/strategy-script-service'
import { StrategyBotService } from '~/domain/service/strategy-bot-service'
import { TradingStrategyService } from '~/domain/service/trading-strategy-service'
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
import { StrategyScriptApplication } from '~/application/strategy-script-application'
import { StrategyBotApplication } from '~/application/strategy-bot-application'
import { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { StrategyScriptMarketplaceProxy } from '~/infrastructure/proxy/strategy-script-marketplace-proxy'
import { StrategyScriptMarketplaceService } from '~/domain/service/strategy-script-marketplace-service'
import { StrategyScriptMarketplaceApplication } from '~/application/strategy-script-marketplace-application'
import { TimeZoneApplication } from '~/application/time-zone-application'
import { ChartIndicatorApplication } from '~/application/chart-indicator-application'
import { AssistantConversationProxy } from '~/infrastructure/proxy/assistant-conversation-proxy'
import { AssistantConversationService } from '~/domain/service/assistant-conversation-service'
import { AssistantConversationApplication } from '~/application/assistant-conversation-application'
import { AssistantTriggerPositionPreferenceProxy } from '~/infrastructure/proxy/assistant-trigger-position-preference-proxy'
import { AssistantTriggerService } from '~/domain/service/assistant-trigger-service'
import { AssistantTriggerApplication } from '~/application/assistant-trigger-application'
import { AssistantDrawerWidthPreferenceProxy } from '~/infrastructure/proxy/assistant-drawer-width-preference-proxy'
import { CurrentConversationPreferenceProxy } from '~/infrastructure/proxy/current-conversation-preference-proxy'
import { AssistantDrawerWidthService } from '~/domain/service/assistant-drawer-width-service'
import { AssistantDrawerWidthApplication } from '~/application/assistant-drawer-width-application'
import { UserProxy } from '~/infrastructure/proxy/user-proxy'
import { SessionStorageProxy } from '~/infrastructure/proxy/session-storage-proxy'
import { UserSessionService } from '~/domain/service/user-session-service'
import { UserSessionApplication } from '~/application/user-session-application'
import { PasswordChangeService } from '~/domain/service/password-change-service'
import { PasswordChangeApplication } from '~/application/password-change-application'
import { TelegramDeliveryProxy } from '~/infrastructure/proxy/telegram-delivery-proxy'
import { TelegramDeliveryService } from '~/domain/service/telegram-delivery-service'
import { TelegramDeliveryApplication } from '~/application/telegram-delivery-application'
import { ClipboardProxy } from '~/infrastructure/proxy/clipboard-proxy'
import { ClipboardService } from '~/domain/service/clipboard-service'
import { ClipboardApplication } from '~/application/clipboard-application'
import { LayoutDensityApplication } from '~/application/layout-density-application'
import { BackendRequestHooks } from '~/infrastructure/proxy/backend-request-hooks'

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

  /**
   * 被擋下來時先試著把這一段救回來。
   *
   * 它跟上面那一件事是**同一個決定的兩半**：登入憑證只活十五分鐘，續用憑證活三十天，
   * 所以「被回 401」絕大多數時候只是過期，不是這個人不算數了。救得回來就重發那一發，
   * 救不回來才走上面那條路。
   *
   * 同樣只是接線：怎麼救住在那一份共用狀態旁邊，因為它換到的新憑證要更新的正是那一份，
   * 而「同時只換一次」也只有在那裡才守得住——每個 proxy 各記一次，九個 proxy 就會
   * 同時換九次，而續用憑證用過就失效。
   */
  const recoverSession = () => useUserSession().recoverExpiredSession()

  /**
   * 開始等一件事——頂端那條進度條就是從這裡知道畫面在等的。
   *
   * 又是一段接線：「現在有幾件事在等」住在全站共用的那份畫面狀態裡，
   * 而發請求的那一層只負責報到。每一個打後端的 proxy 都拿到同一個，所以只有一條進度條。
   */
  const { beginWaiting } = useRequestActivity()

  /** 上面三件事收成一份，每一個打後端的 proxy 都拿到同一份。 */
  const backendRequestHooks = new BackendRequestHooks(onSignedOut, recoverSession, beginWaiting)

  const backendHealthApplication = new BackendHealthApplication(
    new BackendHealthService(new BackendHealthProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  const kCandleApplication = new KCandleApplication(
    new KCandleService(new KCandleProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  const kCandleChartApplication = new KCandleChartApplication(
    new KCandleChartService(new KCandleProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  const tradingSymbolApplication = new TradingSymbolApplication(
    new TradingSymbolService(new TradingSymbolProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  const indicatorCalculationApplication = new IndicatorCalculationApplication(
    new IndicatorCalculationService(new IndicatorCalculationProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  const strategyScriptApplication = new StrategyScriptApplication(
    new StrategyScriptService(new StrategyScriptProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 交易策略是中間那一層：策略腳本那一條回答「我寫了什麼」，這一條回答
  // 「我把它們拼成了什麼判斷」。它有自己的一整條線，因為好幾台機器人共用一份是
  // 它存在的全部理由——綁在機器人那一條線上的話，那件事就做不到。
  const tradingStrategyApplication = new TradingStrategyApplication(
    new TradingStrategyService(
      new TradingStrategyProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 策略機器人是操作台上第一件「沒有人看著的時候還在做事」的東西，所以它有自己的一整條線：
  // 交易策略那一條回答「照什麼判斷」，這一條回答「我派了誰出去、它現在怎麼樣」。
  const strategyBotApplication = new StrategyBotApplication(
    new StrategyBotService(
      new StrategyBotProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 共用的那個貨架是它自己的一件事，所以它有自己的一整條線而不是塞進策略腳本那一條：
  // 那一條回答「我的東西」，這一條回答「外面有什麼」。市集日後長出搜尋、分類或使用次數時，
  // 長的是這一條，而日常挑策略腳本那條路一行都不會動。
  const strategyScriptMarketplaceApplication = new StrategyScriptMarketplaceApplication(
    new StrategyScriptMarketplaceService(
      new StrategyScriptMarketplaceProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
    // 它也要問「哪幾支是我的、哪幾支我收下過」，而那只有自己的清單答得出來。
    new StrategyScriptService(new StrategyScriptProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 重演一支策略腳本是後端的另一項能力，所以它有自己的 proxy 而不是塞進算指標的那一個：
  // 兩者問的問題不同（這一批 K 線上算出什麼 vs 這一段歷史走下來會怎樣），
  // 回來的形狀也完全不同。它同樣不留存，因此這台瀏覽器上沒有任何要記住的東西。
  const backtestApplication = new BacktestApplication(
    new BacktestService(new BacktestProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 圖表上的指標同時要打後端（算）與碰瀏覽器儲存（記住線色、記住旋鈕調成什麼、
  // 記住圖上擺著哪幾支）——前者是行情，後三者是這台機器上的習慣，所以它吃四個 proxy。
  // 三種記憶各有各的 proxy 而不是合成一個「偏好」：它們的鍵不同、生命週期不同，
  // 回答的問題也不同（這條線什麼顏色／我習慣把這支調成幾／圖上擺著哪幾筆），
  // 合起來只會得到一個誰都不好懂的萬用儲存。
  const chartIndicatorApplication = new ChartIndicatorApplication(
    new ChartIndicatorService(
      new IndicatorCalculationProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks),
      new ChartLineColorPreferenceProxy(),
      new StrategyScriptParameterValuePreferenceProxy(),
      new AppliedChartIndicatorPreferenceProxy(),
    ),
  )

  // 跟盤是一條持續連著的通道，與其他那些一次問一次答的完全不同——
  // 所以它有自己的 proxy，而不是塞進取 K 線的那一個。
  const liveKCandleApplication = new LiveKCandleApplication(
    new LiveKCandleService(new LiveKCandleProxy(backendBaseUrl)),
  )

  // 助手是後端的一項能力，因此它只吃 base URL。
  const assistantConversationApplication = new AssistantConversationApplication(
    new AssistantConversationService(new AssistantConversationProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 「正在看哪一段對話」則要記在這台瀏覽器上。它以前只活在共用的畫面狀態裡，
  // 而那撐不過整頁重新載入——助手現在可能寫好幾分鐘，而使用者最可能重整的時機，
  // 正是他等最久、最懷疑畫面壞掉的那一刻。記著的只有識別碼，內容永遠去後端拿。
  //
  // 它不跟上面那一支合併：一個是「我們在談什麼」，一個是「這台機器停在哪一段」，
  // 兩者會分開改變，而且後者換成後端偏好設定時，介面一個字都不必動。
  const currentConversationPreferenceProxy = new CurrentConversationPreferenceProxy()

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
      new UserProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks), sessionStorageProxy),
  )

  // 換密碼走的是同一個後端資源（使用者）的另一條路，所以它共用 UserProxy——
  // 一個外部資源一個 Proxy。它有自己的 service 而不是掛在「現在是誰在用」上，
  // 因為兩者為不同的理由改變：那一個管手上這一段登入還算不算數，這一個管換一組密碼
  // 要過哪幾關。它也不碰記著的那一份憑證：換完之後那一份已經被後端撤掉了，
  // 而「接下來把人帶去哪」是畫面那一層的編排。
  const passwordChangeApplication = new PasswordChangeApplication(
    new PasswordChangeService(
      new UserProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 這台系統要怎麼找到一個人，是後端的另一項能力，所以它有自己的一條線。
  // 這一條日後會長出「哪些事情要送出去」，而那時它長的仍然是這一條。
  const telegramDeliveryApplication = new TelegramDeliveryApplication(
    new TelegramDeliveryService(
      new TelegramDeliveryProxy(backendBaseUrl, sessionStorageProxy, backendRequestHooks)),
  )

  // 現在這個寬度代表什麼。它連瀏覽器儲存都不碰——問的是視窗本身，
  // 所以既沒有 proxy 也沒有 domain service，只有一個把寬度翻成答案的 model。
  const layoutDensityApplication = new LayoutDensityApplication()

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
      indicatorCalculationApplication,
      strategyScriptApplication,
      tradingStrategyApplication,
      strategyBotApplication,
      strategyScriptMarketplaceApplication,
      backtestApplication,
      chartIndicatorApplication,
      liveKCandleApplication,
      timeZoneApplication,
      assistantConversationApplication,
      currentConversationPreferenceProxy,
      assistantTriggerApplication,
      assistantDrawerWidthApplication,
      clipboardApplication,
      userSessionApplication,
      passwordChangeApplication,
      telegramDeliveryApplication,
      layoutDensityApplication,
    },
  }
})
