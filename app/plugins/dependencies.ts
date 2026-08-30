import { BackendHealthProxy } from '~/infrastructure/proxy/backend-health-proxy'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { BackendHealthApplication } from '~/application/backend-health-application'

/**
 * 組裝根：唯一知道所有具體型別的地方。
 * 由外而內組裝 proxy → domain service → application，並把 application provide 給元件層。
 * 元件透過 `const { $backendHealthApplication } = useNuxtApp()` 取用。
 */
export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig()
  const backendBaseUrl = runtimeConfig.public.backendBaseUrl

  const backendHealthProxy = new BackendHealthProxy(backendBaseUrl)
  const backendHealthService = new BackendHealthService(backendHealthProxy)
  const backendHealthApplication = new BackendHealthApplication(backendHealthService)

  return {
    provide: {
      backendHealthApplication,
    },
  }
})
