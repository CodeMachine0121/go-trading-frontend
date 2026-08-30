import { describe, expect, it } from 'vitest'
import { BackendHealth } from '~/domain/models/entities/backend-health'

const CHECKED_AT = new Date('2026-08-30T00:00:00.000Z')

describe('BackendHealthDomain', () => {
  it.each([
    { rawStatus: 'ok', expectedHealthy: true, expectedStatus: 'ok' },
    { rawStatus: 'OK', expectedHealthy: true, expectedStatus: 'ok' },
    { rawStatus: '  ok  ', expectedHealthy: true, expectedStatus: 'ok' },
    { rawStatus: 'degraded', expectedHealthy: false, expectedStatus: 'degraded' },
    { rawStatus: '', expectedHealthy: false, expectedStatus: 'unknown' },
    { rawStatus: '   ', expectedHealthy: false, expectedStatus: 'unknown' },
  ])('把 status "$rawStatus" 正規化後判定 healthy=$expectedHealthy', ({ rawStatus, expectedHealthy, expectedStatus }) => {
    const dto = new BackendHealth(rawStatus, CHECKED_AT).toDomain().toDto()

    expect(dto.healthy).toBe(expectedHealthy)
    expect(dto.status).toBe(expectedStatus)
    expect(dto.checkedAt).toEqual(CHECKED_AT)
  })
})
