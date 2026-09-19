// @vitest-environment nuxt
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LayoutDensityApplication } from '~/application/layout-density-application'
import { useLayoutDensity } from '~/composables/use-layout-density'

const layoutDensityApplication = new LayoutDensityApplication()

/**
 * 一個只做一件事的元件：問「現在這個寬度代表什麼」，把答案掛在畫面上。
 *
 * 走的是元件這條路而不是直接呼叫，因為這個 composable 的重點正是掛載那一刻——
 * 它要在那時候才第一次量視窗，並開始跟著視窗大小改變。
 */
const Screen = defineComponent({
  setup() {
    const { layoutDensity } = useLayoutDensity(layoutDensityApplication)

    /** 這個元件到現在為止被交過幾份**不同的**答案。 */
    const handedOut = new Set<unknown>()

    return () => {
      handedOut.add(layoutDensity.value)

      return h('span', {
        'data-testid': 'answers',
        'data-editing': String(layoutDensity.value.allowsBlockEditing),
        'data-drawer': String(layoutDensity.value.usesNavigationDrawer),
        'data-generation': String(handedOut.size),
      })
    }
  },
})

function answersOf(wrapper: ReturnType<typeof mount>) {
  const element = wrapper.get('[data-testid="answers"]')

  return {
    allowsBlockEditing: element.attributes('data-editing') === 'true',
    usesNavigationDrawer: element.attributes('data-drawer') === 'true',
  }
}

async function resizeWindowTo(width: number) {
  window.innerWidth = width
  window.dispatchEvent(new Event('resize'))
  await nextTick()
}

beforeEach(() => {
  window.innerWidth = 1600
})

afterEach(async () => {
  await resizeWindowTo(1600)
})

describe('useLayoutDensity', () => {
  it('還沒量到視窗以前，回的是一台坐著用的機器', () => {
    // 伺服器端沒有視窗可以量，而猜錯的代價不對稱：猜寬了只是掛載後補正一次，
    // 猜窄了會讓桌機使用者先看到一個蓋住畫面的抽屜與一張改不動的工作檯。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { layoutDensity } = useLayoutDensity(layoutDensityApplication)

    expect(layoutDensity.value.allowsBlockEditing).toBe(true)
    expect(layoutDensity.value.usesNavigationDrawer).toBe(false)

    warn.mockRestore()
  })

  it('掛上去的那一刻就量視窗，窄螢幕上編不動', async () => {
    window.innerWidth = 390
    const wrapper = mount(Screen)
    await nextTick()

    expect(answersOf(wrapper).allowsBlockEditing).toBe(false)

    wrapper.unmount()
  })

  it('視窗被拉窄了，答案跟著改，不必再問一次', async () => {
    const wrapper = mount(Screen)
    await nextTick()
    expect(answersOf(wrapper).allowsBlockEditing).toBe(true)

    await resizeWindowTo(390)

    expect(answersOf(wrapper).allowsBlockEditing).toBe(false)
    expect(answersOf(wrapper).usesNavigationDrawer).toBe(true)

    wrapper.unmount()
  })

  it('同一次瀏覽裡問了兩次，兩邊看到的是同一個寬度', async () => {
    const first = mount(Screen)
    const second = mount(Screen)

    await resizeWindowTo(390)

    expect(answersOf(first)).toEqual(answersOf(second))

    first.unmount()
    second.unmount()
  })

  it('每個看著的元件掛自己的那一份，收起來時也收自己的那一份', () => {
    // 這一則問的是**到底有沒有掛在視窗上**，因為它從答案上看不出來：
    // 一個都沒取消掉，算出來的答案完全一樣，而留下的是一個對著已消失元件喊話的監聽器。
    //
    // 刻意不去數「全站只掛一個」：要做到那件事得有一個跨元件的計數器，
    // 而那個計數器會被「建立了卻從未掛載」的元件減成負的，從此整站不再反應視窗大小。
    const listen = vi.spyOn(window, 'addEventListener')
    const stopListening = vi.spyOn(window, 'removeEventListener')

    const first = mount(Screen)
    const second = mount(Screen)
    first.unmount()
    second.unmount()

    const listened = listen.mock.calls.filter(([event]) => String(event) === 'resize')
    const stopped = stopListening.mock.calls.filter(([event]) => String(event) === 'resize')

    expect(listened).toHaveLength(2)
    expect(stopped.map(([, handler]) => handler)).toEqual(listened.map(([, handler]) => handler))

    listen.mockRestore()
    stopListening.mockRestore()
  })

  it('寬度變了但答案沒變，交出去的還是同一份答案', async () => {
    // 拖動視窗邊緣的那一秒裡，寬度每一幀都在變。每一幀換一份新的答案，
    // 拿著它的三棵樹就會各重繪六十次，而那五個布林一個都沒變。
    const wrapper = mount(Screen)
    await nextTick()
    const beforeDragging = answersOf(wrapper)

    await resizeWindowTo(1500)
    await resizeWindowTo(1400)

    expect(answersOf(wrapper)).toEqual(beforeDragging)
    expect(wrapper.get('[data-testid="answers"]').attributes('data-generation')).toBe('1')
  })

  it('只跨過導覽那一道分界，也算答案變了', async () => {
    // 1200 到 900 之間，五個答案裡只有「導覽是不是抽屜」變了——
    // 比較時漏掉任何一項，畫面就會停在上一個答案上，而且不會有人發現。
    const wrapper = mount(Screen)
    await nextTick()

    await resizeWindowTo(1200)
    expect(answersOf(wrapper).usesNavigationDrawer).toBe(false)

    await resizeWindowTo(900)

    expect(answersOf(wrapper).usesNavigationDrawer).toBe(true)
    expect(answersOf(wrapper).allowsBlockEditing).toBe(true)
  })

  it('全部收起來之後再打開一個，仍然跟著視窗跑', async () => {
    mount(Screen).unmount()

    const lonely = mount(Screen)
    await resizeWindowTo(390)

    expect(answersOf(lonely).allowsBlockEditing).toBe(false)

    lonely.unmount()
  })
})
