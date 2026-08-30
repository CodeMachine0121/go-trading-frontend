import type { BackendHealth } from '~/domain/models/entities/backend-health'

/**
 * 介面以「能力」命名，不以供應商命名——換一家後端這個名字不用改。
 * 實作在 app/infrastructure/proxy/backend-health-proxy.ts。
 */
export interface IBackendHealthProxy {
  fetchBackendHealth(): Promise<BackendHealth>
}
