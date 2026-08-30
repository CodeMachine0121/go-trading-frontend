import { describe, expect, it, vi } from 'vitest'
import type { IBackendHealthProxy } from '~/domain/interface/i-backend-health-proxy'
import { BackendHealth } from '~/domain/models/entities/backend-health'
import { BackendHealthService } from '~/domain/service/backend-health-service'
import { BackendHealthApplication } from '~/application/backend-health-application'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

/**
 * 測試力度放大：注入真實的 domain service（連帶真實 entity / domain model），
 * 只 mock 最外層的 proxy 介面。
 */
function buildApplication(rawStatus: string): BackendHealthApplication {
  const backendHealthProxy: IBackendHealthProxy = {
    fetchBackendHealth: vi.fn().mockResolvedValue(new BackendHealth(rawStatus, CHECKED_AT)),
  }
  return new BackendHealthApplication(new BackendHealthService(backendHealthProxy))
}

describe('BackendHealthApplication', () => {
  it.each([
    { rawStatus: 'Healthy', expectedHealthy: true, expectedStatus: 'healthy' },
    { rawStatus: 'healthy ', expectedHealthy: true, expectedStatus: 'healthy' },
    { rawStatus: 'unavailable', expectedHealthy: false, expectedStatus: 'unavailable' },
  ])('checkBackendHealth 回傳 DTO（status=$rawStatus）', async ({ rawStatus, expectedHealthy, expectedStatus }) => {
    const dto = await buildApplication(rawStatus).checkBackendHealth()

    expect(dto.healthy).toBe(expectedHealthy)
    expect(dto.status).toBe(expectedStatus)
  })
})
