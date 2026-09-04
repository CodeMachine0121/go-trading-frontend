import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantDrawerWidthPreferenceProxy } from '~/infrastructure/proxy/assistant-drawer-width-preference-proxy'

const STORAGE_KEY = 'go-trading:assistant-drawer-width'

afterEach(() => {
  // 先把替身撤掉再清，否則清的是那個什麼都不會的替身。
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AssistantDrawerWidthPreferenceProxy', () => {
  it('記住的寬度讀得回來', () => {
    new AssistantDrawerWidthPreferenceProxy().writeDrawerWidth(560)

    expect(new AssistantDrawerWidthPreferenceProxy().readDrawerWidth()).toBe(560)
  })

  it('沒拉過就是沒拉過', () => {
    expect(new AssistantDrawerWidthPreferenceProxy().readDrawerWidth()).toBeNull()
  })

  it.each([
    { name: '不是數字', storedValue: 'wide' },
    { name: '空的', storedValue: '' },
    { name: '零', storedValue: '0' },
    { name: '負數', storedValue: '-100' },
  ])('記著的東西說不通時當作沒拉過（$name）', ({ storedValue }) => {
    // 一個說不通的寬度比沒有寬度更難處理：抽屜回到預設寬度就好。
    localStorage.setItem(STORAGE_KEY, storedValue)

    expect(new AssistantDrawerWidthPreferenceProxy().readDrawerWidth()).toBeNull()
  })

  it('瀏覽器不讓存取儲存時，讀當作沒拉過、寫也不會壞掉', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('access denied')
      },
      setItem: () => {
        throw new Error('access denied')
      },
    })

    const proxy = new AssistantDrawerWidthPreferenceProxy()

    expect(proxy.readDrawerWidth()).toBeNull()
    expect(() => proxy.writeDrawerWidth(560)).not.toThrow()
  })
})
