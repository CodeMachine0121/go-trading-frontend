import type { IBackendHealthProxy } from '~/domain/interface/i-backend-health-proxy'
import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'

/**
 * Domain Service：application 的唯一呼叫入口。
 * 透過介面取得 entity → 包成 Domain Model 執行行為 → 轉成 DTO 回傳。
 */
export class BackendHealthService {
  constructor(private readonly backendHealthProxy: IBackendHealthProxy) {}

  async checkBackendHealth(): Promise<BackendHealthDto> {
    const backendHealth = await this.backendHealthProxy.fetchBackendHealth()
    return backendHealth.toDomain().toDto()
  }
}
