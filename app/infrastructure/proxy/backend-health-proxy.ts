import type { IBackendHealthProxy } from '~/domain/interface/i-backend-health-proxy'
import { BackendHealth } from '~/domain/models/entities/backend-health'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

const HEALTH_ENDPOINT = '/health'

/** 後端回傳的原始 wire 形狀，只存在於本檔內，不外流進 domain。 */
type BackendHealthWire = {
  status: string
}

/**
 * Proxy：唯一允許出現 $fetch 的地方。
 * 負責把 wire 格式正規化成 entity，並把底層錯誤包成哨兵錯誤。
 */
export class BackendHealthProxy implements IBackendHealthProxy {
  constructor(private readonly baseUrl: string) {}

  async fetchBackendHealth(): Promise<BackendHealth> {
    const endpoint = `${this.baseUrl}${HEALTH_ENDPOINT}`
    try {
      const wire = await $fetch<BackendHealthWire>(endpoint)
      return new BackendHealth(wire.status, new Date())
    }
    catch (error: unknown) {
      throw new BackendUnreachableError(endpoint, { cause: error })
    }
  }
}
