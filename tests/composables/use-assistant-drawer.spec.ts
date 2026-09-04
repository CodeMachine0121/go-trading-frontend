// @vitest-environment nuxt
import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const route = reactive({ fullPath: '/k-candles' })

mockNuxtImport('useRoute', () => () => route)

describe('useAssistantDrawer', () => {
  it('一開始是收起來的', () => {
    const { open } = useAssistantDrawer()

    expect(open.value).toBe(false)
  })

  it('叫得出來也收得回去', () => {
    const { open, openDrawer, closeDrawer } = useAssistantDrawer()

    openDrawer()
    expect(open.value).toBe(true)

    closeDrawer()
    expect(open.value).toBe(false)
  })

  it('換畫面就收起來', async () => {
    // 抽屜是隨手問一句的地方，不是常駐側欄——跟著使用者走到下一個畫面的浮層，
    // 會遮住他真正想去看的東西。
    const { open, openDrawer } = useAssistantDrawer()
    openDrawer()

    route.fullPath = '/indicator-calculations'
    await nextTick()

    expect(open.value).toBe(false)
  })
})
