import { describe, expect, it, vi } from 'vitest'
import { TimeZoneService } from '~/domain/service/time-zone-service'
import type { ITimeZonePreferenceProxy } from '~/domain/interface/i-time-zone-preference-proxy'

function buildProxy(rememberedIdentifier: string | null = null): ITimeZonePreferenceProxy {
  return {
    readSelectedTimeZoneIdentifier: vi.fn().mockReturnValue(rememberedIdentifier),
    writeSelectedTimeZoneIdentifier: vi.fn(),
  }
}

describe('TimeZoneService', () => {
  describe('listSelectableTimeZones', () => {
    it('列出可選時區，第一個是世界標準時間', () => {
      const timeZoneService = new TimeZoneService(buildProxy())

      const selectableTimeZones = timeZoneService.listSelectableTimeZones()

      expect(selectableTimeZones.length).toBeGreaterThan(1)
      expect(selectableTimeZones[0]?.identifier).toBe('UTC')
      expect(selectableTimeZones.map(timeZone => timeZone.identifier)).toContain('Asia/Taipei')
    })

    it('每一個都標出目前的位移', () => {
      const timeZoneService = new TimeZoneService(buildProxy())

      const selectableTimeZones = timeZoneService.listSelectableTimeZones()

      expect(selectableTimeZones.every(
        timeZone => /^UTC[+-]\d{2}:\d{2}$/.test(timeZone.offsetLabel))).toBe(true)
      expect(selectableTimeZones.find(
        timeZone => timeZone.identifier === 'Asia/Taipei')?.offsetLabel).toBe('UTC+08:00')
    })
  })

  describe('restoreSelectedTimeZone', () => {
    it.each([
      { description: '沒有記住任何東西', rememberedIdentifier: null },
      { description: '記住的不在清單上', rememberedIdentifier: 'Mars/Olympus_Mons' },
    ])('$description 時退回世界標準時間', ({ rememberedIdentifier }) => {
      const timeZoneService = new TimeZoneService(buildProxy(rememberedIdentifier))

      expect(timeZoneService.restoreSelectedTimeZone().identifier).toBe('UTC')
    })

    it('記住的在清單上時就是它', () => {
      const timeZoneService = new TimeZoneService(buildProxy('Asia/Taipei'))

      const selectedTimeZone = timeZoneService.restoreSelectedTimeZone()

      expect(selectedTimeZone.identifier).toBe('Asia/Taipei')
      expect(selectedTimeZone.cityLabel).toBe('台北')
    })
  })

  describe('selectTimeZone', () => {
    it('選定的時區會被記住', () => {
      const timeZonePreferenceProxy = buildProxy()
      const timeZoneService = new TimeZoneService(timeZonePreferenceProxy)

      const selectedTimeZone = timeZoneService.selectTimeZone('Asia/Tokyo')

      expect(selectedTimeZone.identifier).toBe('Asia/Tokyo')
      expect(timeZonePreferenceProxy.writeSelectedTimeZoneIdentifier)
        .toHaveBeenCalledWith('Asia/Tokyo')
    })

    it('看不懂的識別字退回世界標準時間，記住的也是退回後的那一個', () => {
      const timeZonePreferenceProxy = buildProxy()
      const timeZoneService = new TimeZoneService(timeZonePreferenceProxy)

      const selectedTimeZone = timeZoneService.selectTimeZone('Mars/Olympus_Mons')

      expect(selectedTimeZone.identifier).toBe('UTC')
      expect(timeZonePreferenceProxy.writeSelectedTimeZoneIdentifier).toHaveBeenCalledWith('UTC')
    })
  })

  describe('findTimeZone', () => {
    it('依識別字取回時區，且不記住任何東西', () => {
      const timeZonePreferenceProxy = buildProxy()
      const timeZoneService = new TimeZoneService(timeZonePreferenceProxy)

      expect(timeZoneService.findTimeZone('Asia/Taipei').cityLabel).toBe('台北')
      expect(timeZonePreferenceProxy.writeSelectedTimeZoneIdentifier).not.toHaveBeenCalled()
    })

    it('看不懂的識別字退回世界標準時間', () => {
      const timeZoneService = new TimeZoneService(buildProxy())

      expect(timeZoneService.findTimeZone('').identifier).toBe('UTC')
    })
  })
})
