import { describe, expect, it, vi } from 'vitest'
import { TimeZoneApplication } from '~/application/time-zone-application'
import { TimeZoneService } from '~/domain/service/time-zone-service'
import type { ITimeZonePreferenceProxy } from '~/domain/interface/i-time-zone-preference-proxy'

// 只 mock 最外層的 proxy 介面；domain service 與 domain model 都是真的。
function buildApplication(timeZonePreferenceProxy: ITimeZonePreferenceProxy): TimeZoneApplication {
  return new TimeZoneApplication(new TimeZoneService(timeZonePreferenceProxy))
}

function buildProxy(rememberedIdentifier: string | null = null): ITimeZonePreferenceProxy {
  return {
    readSelectedTimeZoneIdentifier: vi.fn().mockReturnValue(rememberedIdentifier),
    writeSelectedTimeZoneIdentifier: vi.fn(),
  }
}

describe('TimeZoneApplication', () => {
  it('沒有記住任何東西時，選定的是世界標準時間', () => {
    const timeZoneApplication = buildApplication(buildProxy())

    expect(timeZoneApplication.restoreSelectedTimeZone().identifier).toBe('UTC')
  })

  it('選一個時區之後，下一次讀回的就是它', () => {
    const rememberedIdentifiers: string[] = []
    const timeZonePreferenceProxy: ITimeZonePreferenceProxy = {
      readSelectedTimeZoneIdentifier: vi.fn(() => rememberedIdentifiers.at(-1) ?? null),
      writeSelectedTimeZoneIdentifier: vi.fn((identifier: string) => {
        rememberedIdentifiers.push(identifier)
      }),
    }
    const timeZoneApplication = buildApplication(timeZonePreferenceProxy)

    timeZoneApplication.selectTimeZone('Asia/Taipei')

    expect(timeZoneApplication.restoreSelectedTimeZone().identifier).toBe('Asia/Taipei')
  })

  it('選定的時區說得出一個瞬間的當地時間', () => {
    const timeZoneApplication = buildApplication(buildProxy('Asia/Taipei'))

    const selectedTimeZone = timeZoneApplication.restoreSelectedTimeZone()

    expect(selectedTimeZone.formatDateTime(new Date('2026-08-30T04:00:00.000Z')))
      .toBe('2026-08-30 12:00')
  })

  it('可選清單一律列得出來，不必問任何外部資源', () => {
    const timeZonePreferenceProxy = buildProxy()
    const timeZoneApplication = buildApplication(timeZonePreferenceProxy)

    expect(timeZoneApplication.listSelectableTimeZones().length).toBeGreaterThan(1)
    expect(timeZonePreferenceProxy.readSelectedTimeZoneIdentifier).not.toHaveBeenCalled()
  })
})
