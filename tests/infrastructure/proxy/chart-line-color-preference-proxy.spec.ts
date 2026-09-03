import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChartLineColorPreferenceProxy } from '~/infrastructure/proxy/chart-line-color-preference-proxy'

const STORAGE_KEY = 'go-trading:chart-line-color:7:均價'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChartLineColorPreferenceProxy', () => {
  it('把一條線挑過的顏色記在瀏覽器儲存裡', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { getItem: vi.fn(), setItem })

    new ChartLineColorPreferenceProxy().writeColorToken('7:均價', '--color-chart-line-5')

    expect(setItem).toHaveBeenCalledWith(STORAGE_KEY, '--color-chart-line-5')
  })

  it('讀回這條線挑過的顏色', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue('--color-chart-line-5'),
      setItem: vi.fn(),
    })

    expect(new ChartLineColorPreferenceProxy().readColorToken('7:均價'))
      .toBe('--color-chart-line-5')
  })

  it('沒挑過就是沒挑過', () => {
    vi.stubGlobal('localStorage', { getItem: vi.fn().mockReturnValue(null), setItem: vi.fn() })

    expect(new ChartLineColorPreferenceProxy().readColorToken('7:均價')).toBeNull()
  })

  it('瀏覽器不讓讀時，當成沒挑過而不是壞掉', () => {
    // 無痕視窗或封鎖網站資料時，存取本身就會拋。
    // 那與「還沒挑過」對使用者是同一件事：用依序取到的那個顏色。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('access denied')
      }),
      setItem: vi.fn(),
    })

    expect(new ChartLineColorPreferenceProxy().readColorToken('7:均價')).toBeNull()
  })

  it('瀏覽器不讓寫時，這一次的換色照樣成立', () => {
    // 記不住不該讓畫面停住：線這一次已經換色了，只是下次打開會回到預設。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(() => {
        throw new Error('quota exceeded')
      }),
    })

    expect(() => new ChartLineColorPreferenceProxy()
      .writeColorToken('7:均價', '--color-chart-line-5')).not.toThrow()
  })
})
