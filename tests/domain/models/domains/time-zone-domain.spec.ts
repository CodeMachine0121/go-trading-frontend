import { describe, expect, it } from 'vitest'
import { TimeZone } from '~/domain/models/entities/time-zone'

/** 夏天：倫敦在日光節約時間內、紐約也是。 */
const SUMMER_INSTANT = new Date('2026-08-30T04:00:00.000Z')
/** 冬天：兩地都回到標準時間。 */
const WINTER_INSTANT = new Date('2026-01-30T04:00:00.000Z')

describe('TimeZoneDomain', () => {
  it.each([
    { identifier: 'UTC', expected: 'UTC+00:00' },
    { identifier: 'Asia/Taipei', expected: 'UTC+08:00' },
    { identifier: 'America/New_York', expected: 'UTC-04:00' },
  ])('$identifier 在夏天的位移標籤是 $expected', ({ identifier, expected }) => {
    const timeZoneDomain = new TimeZone(identifier, '某地').toDomain()

    expect(timeZoneDomain.offsetLabelAt(SUMMER_INSTANT)).toBe(expected)
  })

  it.each([
    { identifier: 'Europe/London', summer: 'UTC+01:00', winter: 'UTC+00:00' },
    { identifier: 'America/New_York', summer: 'UTC-04:00', winter: 'UTC-05:00' },
  ])('$identifier 的位移隨日光節約時間改變', ({ identifier, summer, winter }) => {
    const timeZoneDomain = new TimeZone(identifier, '某地').toDomain()

    expect(timeZoneDomain.offsetLabelAt(SUMMER_INSTANT)).toBe(summer)
    expect(timeZoneDomain.offsetLabelAt(WINTER_INSTANT)).toBe(winter)
  })

  it('轉成 DTO 時帶著識別字、城市名與那一刻的位移', () => {
    const timeZoneDto = new TimeZone('Asia/Taipei', '台北').toDomain().toDtoAt(SUMMER_INSTANT)

    expect(timeZoneDto.identifier).toBe('Asia/Taipei')
    expect(timeZoneDto.cityLabel).toBe('台北')
    expect(timeZoneDto.offsetLabel).toBe('UTC+08:00')
    expect(timeZoneDto.label).toBe('台北（UTC+08:00）')
  })
})
