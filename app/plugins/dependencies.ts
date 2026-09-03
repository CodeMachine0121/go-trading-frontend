import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { TradingSymbolProxy } from '~/infrastructure/proxy/trading-symbol-proxy'
import { IndicatorCalculationProxy } from '~/infrastructure/proxy/indicator-calculation-proxy'
import { StrategyProxy } from '~/infrastructure/proxy/strategy-proxy'
import { TimeZonePreferenceProxy } from '~/infrastructure/proxy/time-zone-preference-proxy'
import { ChartLineColorPreferenceProxy } from '~/infrastructure/proxy/chart-line-color-preference-proxy'
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

  // 圖表上的指標同時要打後端（算）與碰瀏覽器儲存（記住線色）——
  // 前者是行情，後者是這台機器上的習慣，所以它吃兩個 proxy。
  const chartIndicatorApplication = new ChartIndicatorApplication(
    new ChartIndicatorService(
      new IndicatorCalculationProxy(backendBaseUrl),
      new ChartLineColorPreferenceProxy(),
    ),
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
      timeZoneApplication,
    },
  }
})
