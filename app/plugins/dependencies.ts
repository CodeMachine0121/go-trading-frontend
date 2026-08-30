import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { KCandleProxy } from '~/infrastructure/proxy/k-candle-proxy'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { KCandleService } from '~/domain/service/k-candle-service'
import { BackendHealthApplication } from '~/application/backend-health-application'
import { KCandleApplication } from '~/application/k-candle-application'

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

  return {
    provide: {
      backendHealthApplication,
      kCandleApplication,
    },
  }
})
