import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { StrategyProxy } from '~/infrastructure/proxy/strategy-proxy'
import { TimeZonePreferenceProxy } from '~/infrastructure/proxy/time-zone-preference-proxy'
import { ChartLineColorPreferenceProxy } from '~/infrastructure/proxy/chart-line-color-preference-proxy'
import { StrategyParameterValuePreferenceProxy } from '~/infrastructure/proxy/strategy-parameter-value-preference-proxy'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { KCandleService } from '~/domain/service/k-candle-service'
import { KCandleChartService } from '~/domain/service/k-candle-chart-service'
import { TradingSymbolService } from '~/domain/service/trading-symbol-service'
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
import { TimeZoneApplication } from '~/application/time-zone-application'
import { ChartIndicatorApplication } from '~/application/chart-indicator-application'

/**
 * 組裝根：唯一知道所有具體型別的地方。
 * 由外而內組裝 proxy → domain service → application，並把 application provide 給元件層。
 * 元件透過 `const { $kCandleApplication } = useNuxtApp()` 取用。
 */
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const backendBaseUrl = runtimeConfig.public.backendBaseUrl

  const backendHealthApplication = new BackendHealthApplication(
    new BackendHealthService(new BackendHealthProxy(backendBaseUrl)),
  )

  const kCandleApplication = new KCandleApplication(
    new KCandleService(new KCandleProxy(backendBaseUrl)),
  )

  const kCandleChartApplication = new KCandleChartApplication(
    new KCandleChartService(new KCandleProxy(backendBaseUrl)),
  )

  const tradingSymbolApplication = new TradingSymbolApplication(
    new TradingSymbolService(new TradingSymbolProxy(backendBaseUrl)),
  )

  const indicatorCalculationApplication = new IndicatorCalculationApplication(
    new IndicatorCalculationService(new IndicatorCalculationProxy(backendBaseUrl)),
  )

  const strategyApplication = new StrategyApplication(
    new StrategyService(new StrategyProxy(backendBaseUrl)),
  )

  // 圖表上的指標同時要打後端（算）與碰瀏覽器儲存（記住線色、記住旋鈕調成什麼）——
  // 前者是行情，後兩者是這台機器上的習慣，所以它吃三個 proxy。
  // 線色與旋鈕值各有各的 proxy 而不是合成一個「偏好」：它們的鍵不同、
  // 生命週期不同，合起來只會得到一個誰都不好懂的萬用儲存。
  const chartIndicatorApplication = new ChartIndicatorApplication(
    new ChartIndicatorService(
      new IndicatorCalculationProxy(backendBaseUrl),
      new ChartLineColorPreferenceProxy(),
      new StrategyParameterValuePreferenceProxy(),
    ),
  )

  // 跟盤是一條持續連著的通道，與其他那些一次問一次答的完全不同——
  // 所以它有自己的 proxy，而不是塞進取 K 線的那一個。
  const liveKCandleApplication = new LiveKCandleApplication(
    new LiveKCandleService(new LiveKCandleProxy(backendBaseUrl)),
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
      indicatorCalculationApplication,
      strategyApplication,
      chartIndicatorApplication,
      liveKCandleApplication,
      timeZoneApplication,
    },
  }
})
