import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyScriptParameterValuePreferenceProxy } from '~/infrastructure/proxy/strategy-script-parameter-value-preference-proxy'

const STRATEGY_ID = 7

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('StrategyScriptParameterValuePreferenceProxy', () => {
  it('寫進去的值讀得回來', () => {
    const proxy = new StrategyScriptParameterValuePreferenceProxy()

    proxy.writeValue(STRATEGY_ID, '期數', 60)

    expect(proxy.readValue(STRATEGY_ID, '期數')).toBe(60)
  })

  it('小數也讀得回來', () => {
    const proxy = new StrategyScriptParameterValuePreferenceProxy()

    proxy.writeValue(STRATEGY_ID, '倍數', 1.5)

    expect(proxy.readValue(STRATEGY_ID, '倍數')).toBe(1.5)
  })

  it('沒調過就是 null', () => {
    expect(new StrategyScriptParameterValuePreferenceProxy().readValue(STRATEGY_ID, '期數')).toBeNull()
  })

  it.each([
    { name: '不同策略腳本', strategyScriptId: 8, parameterName: '期數' },
    { name: '不同旋鈕', strategyScriptId: STRATEGY_ID, parameterName: '倍數' },
  ])('$name 各記各的，不會互相蓋掉', ({ strategyScriptId, parameterName }) => {
    const proxy = new StrategyScriptParameterValuePreferenceProxy()
    proxy.writeValue(STRATEGY_ID, '期數', 60)

    expect(proxy.readValue(strategyScriptId, parameterName)).toBeNull()
  })

  it('儲存裡放著讀不成數字的東西時，當成沒調過', () => {
    // 別的版本、別的分頁、甚至使用者自己都可能在那裡留下讀不成數字的東西。
    localStorage.setItem('go-trading:chart-strategy-script-parameter:7:期數', 'abc')

    expect(new StrategyScriptParameterValuePreferenceProxy().readValue(STRATEGY_ID, '期數')).toBeNull()
  })

  it('瀏覽器不讓讀時當成沒調過，而不是壞掉', () => {
    // 無痕視窗、封鎖網站資料時存取本身會拋出例外。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
      setItem: vi.fn(),
    })

    expect(new StrategyScriptParameterValuePreferenceProxy().readValue(STRATEGY_ID, '期數')).toBeNull()
  })

  it('瀏覽器不讓寫時不影響這一次的操作', () => {
    // 圖上那條線已經用調過的值算完了，只是下次打開會回到預設。
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(() => {
        throw new Error('storage blocked')
      }),
    })

    expect(() => new StrategyScriptParameterValuePreferenceProxy()
      .writeValue(STRATEGY_ID, '期數', 60)).not.toThrow()
  })
})
