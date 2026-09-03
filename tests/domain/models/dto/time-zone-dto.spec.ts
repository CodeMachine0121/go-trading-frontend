import { describe, expect, it } from 'vitest'
import { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

const INSTANT = new Date('2026-08-30T04:00:00.000Z')

function buildTimeZone(identifier: string, cityLabel = '某地', offsetLabel = 'UTC+00:00'): TimeZoneDto {
  return new TimeZoneDto(identifier, cityLabel, offsetLabel)
}

describe('TimeZoneDto', () => {
  it.each([
    { identifier: 'UTC', expected: '2026-08-30 04:00' },
    { identifier: 'Asia/Taipei', expected: '2026-08-30 12:00' },
    { identifier: 'Asia/Tokyo', expected: '2026-08-30 13:00' },
    { identifier: 'America/New_York', expected: '2026-08-30 00:00' },
  ])('同一個瞬間在 $identifier 說成 $expected', ({ identifier, expected }) => {
    expect(buildTimeZone(identifier).formatDateTime(INSTANT)).toBe(expected)
  })

  it('分鐘精度輸入的值用的是同一個說法', () => {
    expect(buildTimeZone('Asia/Taipei').formatMinuteInput(INSTANT)).toBe('2026-08-30T12:00')
  })

  it.each([
    { identifier: 'UTC', inputValue: '2026-08-30T12:00', expected: '2026-08-30T12:00:00.000Z' },
    { identifier: 'Asia/Taipei', inputValue: '2026-08-30T12:00', expected: '2026-08-30T04:00:00.000Z' },
    { identifier: 'Europe/London', inputValue: '2026-08-30T12:00', expected: '2026-08-30T11:00:00.000Z' },
  ])('$identifier 填的 $inputValue 讀回 $expected', ({ identifier, inputValue, expected }) => {
    expect(buildTimeZone(identifier).parseMinuteInput(inputValue).toISOString()).toBe(expected)
  })

  it.each([
    { description: '日光節約時間開始前一天', inputValue: '2026-03-07T12:00', expected: '2026-03-07T17:00:00.000Z' },
    { description: '日光節約時間開始後一天', inputValue: '2026-03-09T12:00', expected: '2026-03-09T16:00:00.000Z' },
    { description: '日光節約時間結束後一天', inputValue: '2026-11-02T12:00', expected: '2026-11-02T17:00:00.000Z' },
  ])('紐約在 $description 填的時間讀回的瞬間跟著位移走', ({ inputValue, expected }) => {
    expect(buildTimeZone('America/New_York').parseMinuteInput(inputValue).toISOString()).toBe(expected)
  })

  it.each([
    { description: '被清空', inputValue: '' },
    { description: '只填一半', inputValue: '2026-08-30' },
  ])('值 $description 時讀回一個無效的時間值', ({ inputValue }) => {
    expect(Number.isNaN(buildTimeZone('Asia/Taipei').parseMinuteInput(inputValue).getTime())).toBe(true)
  })

  it('選單上的說法是城市名加上目前的位移', () => {
    expect(buildTimeZone('Asia/Taipei', '台北', 'UTC+08:00').label).toBe('台北（UTC+08:00）')
  })
})
