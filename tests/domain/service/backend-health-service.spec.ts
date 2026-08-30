import { describe, expect, it, vi } from 'vitest'
import type { IBackendHealthProxy } from '~/domain/interface/i-backend-health-proxy'
import { BackendHealth } from '~/domain/models/entities/backend-health'
import { BackendHealthService } from '~/domain/service/backend-health-service'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

// 替身一律用 vi.fn() 對介面產生，不手刻 Fake class（見 .claude/rules/testing.md）
function buildBackendHealthProxyMock(backendHealth: BackendHealth): IBackendHealthProxy {
  return {
    fetchBackendHealth: vi.fn().mockResolvedValue(backendHealth),
  }
}

describe('BackendHealthService', () => {
  it.each([
    { rawStatus: 'Healthy', expectedHealthy: true },
    { rawStatus: 'down', expectedHealthy: false },
  ])('把 proxy 回傳的 entity 轉成 DTO（status=$rawStatus）', async ({ rawStatus, expectedHealthy }) => {
    const backendHealthProxy = buildBackendHealthProxyMock(new BackendHealth(rawStatus, CHECKED_AT))

    const dto = await new BackendHealthService(backendHealthProxy).checkBackendHealth()

    expect(dto.healthy).toBe(expectedHealthy)
    expect(backendHealthProxy.fetchBackendHealth).toHaveBeenCalledTimes(1)
  })

  it('proxy 拋錯時往上拋，不吞掉', async () => {
    const failure = new Error('boom')
    const backendHealthProxy: IBackendHealthProxy = {
      fetchBackendHealth: vi.fn().mockRejectedValue(failure),
    }

    await expect(new BackendHealthService(backendHealthProxy).checkBackendHealth()).rejects.toThrow(failure)
  })
})
