import type { IBackendHealthProxy } from '~/domain/interface/i-backend-health-proxy'
import { BackendHealth } from '~/domain/models/entities/backend-health'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const HEALTH_ENDPOINT = '/health'

/** 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。 */
type BackendHealthWire = {
  status: string
}

/** Proxy：唯一允許出現 $fetch 的地方（實際請求與錯誤翻譯由 BackendApiProxy 負責）。 */
export class BackendHealthProxy extends BackendApiProxy implements IBackendHealthProxy {
  async fetchBackendHealth(): Promise<BackendHealth> {
    const wire = await this.requestBackend<BackendHealthWire>(HEALTH_ENDPOINT)
    return new BackendHealth(wire.status, new Date())
  }
}
