import { afterEach, describe, expect, it, vi } from 'vitest'
import { AssistantTriggerPositionPreferenceProxy } from '~/infrastructure/proxy/assistant-trigger-position-preference-proxy'
import { AssistantTriggerPositionDto } from '~/domain/models/dto/assistant-trigger-position-dto'

const STORAGE_KEY = 'go-trading:assistant-trigger-position'

afterEach(() => {
  // 先把替身撤掉再清，否則清的是那個什麼都不會的替身。
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('AssistantTriggerPositionPreferenceProxy', () => {
  it('記住的位置讀得回來', () => {
    new AssistantTriggerPositionPreferenceProxy()
      .writeTriggerPosition(new AssistantTriggerPositionDto(120, 240))

    expect(new AssistantTriggerPositionPreferenceProxy().readTriggerPosition())
      .toEqual(new AssistantTriggerPositionDto(120, 240))
  })

  it('沒擺過就是沒擺過', () => {
    expect(new AssistantTriggerPositionPreferenceProxy().readTriggerPosition()).toBeNull()
  })

  it.each([
    { name: '不是兩個數字', storedValue: 'somewhere' },
    { name: '只有一半', storedValue: '120' },
    { name: '其中一個讀不出來', storedValue: '120,abc' },
    { name: '負的距離', storedValue: '-10,20' },
    { name: '空的', storedValue: '' },
  ])('記著的東西壞掉時當作沒擺過（$name）', ({ storedValue }) => {
    // 一個讀不出來的位置與沒有位置是同一種情況：那顆鍵回到右下角。
    // 半個位置比沒有位置更難處理。
    localStorage.setItem(STORAGE_KEY, storedValue)

    expect(new AssistantTriggerPositionPreferenceProxy().readTriggerPosition()).toBeNull()
  })

  it('瀏覽器不讓存取儲存時，讀當作沒擺過、寫也不會壞掉', () => {
    // 無痕視窗或封鎖網站資料時，存取本身就會拋出例外。
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('access denied')
      },
      setItem: () => {
        throw new Error('access denied')
      },
    })

    const proxy = new AssistantTriggerPositionPreferenceProxy()

    expect(proxy.readTriggerPosition()).toBeNull()
    expect(() => proxy.writeTriggerPosition(new AssistantTriggerPositionDto(1, 2))).not.toThrow()
  })
})
