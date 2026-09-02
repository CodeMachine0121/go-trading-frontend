import { describe, expect, it } from 'vitest'
import { BackendHealth } from '~/domain/models/entities/backend-health'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

describe('BackendHealthDomain', () => {
  it.each([
    { rawStatus: 'Healthy', expectedHealthy: true, expectedStatus: 'healthy' },
    { rawStatus: 'healthy', expectedHealthy: true, expectedStatus: 'healthy' },
    { rawStatus: '  Healthy  ', expectedHealthy: true, expectedStatus: 'healthy' },
    { rawStatus: 'ok', expectedHealthy: false, expectedStatus: 'ok' },
    { rawStatus: 'degraded', expectedHealthy: false, expectedStatus: 'degraded' },
    { rawStatus: '', expectedHealthy: false, expectedStatus: 'unknown' },
    { rawStatus: '   ', expectedHealthy: false, expectedStatus: 'unknown' },
  ])('把 status "$rawStatus" 正規化後判定 healthy=$expectedHealthy', ({ rawStatus, expectedHealthy, expectedStatus }) => {
    const dto = new BackendHealth(rawStatus, CHECKED_AT).toDomain().toDto()

    expect(dto.healthy).toBe(expectedHealthy)
    expect(dto.status).toBe(expectedStatus)
    expect(dto.checkedAt).toEqual(CHECKED_AT)
  })

  it.each([
    { rawStatus: 'healthy', expectedLabel: '正常', expectedTone: 'success' },
    { rawStatus: 'degraded', expectedLabel: '異常', expectedTone: 'danger' },
  ])('「$rawStatus」在畫面上叫「$expectedLabel」，語氣是 $expectedTone', (
    { rawStatus, expectedLabel, expectedTone },
  ) => {
    const dto = new BackendHealth(rawStatus, CHECKED_AT).toDomain().toDto()

    // 名字與語氣由領域決定，畫面不得自己寫 `healthy ? '正常' : '異常'`
    expect(dto.label).toBe(expectedLabel)
    expect(dto.tone).toBe(expectedTone)
  })
})
