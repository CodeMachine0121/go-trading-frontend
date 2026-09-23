// @vitest-environment nuxt
// 「正在等」是跨畫面共用的狀態（`useState`），需要 Nuxt runtime 才問得到它。
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('useRequestActivity', () => {
  beforeEach(() => {
    clearNuxtState()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    { elapsed: 199, visible: false },
    { elapsed: 200, visible: true },
  ])('開始等一件事，過了 $elapsed 毫秒時進度條 visible = $visible', ({ elapsed, visible }) => {
    const { visible: shown, beginWaiting } = useRequestActivity()

    beginWaiting()
    vi.advanceTimersByTime(elapsed)

    expect(shown.value).toBe(visible)
  })

  it('一眨眼就回來的那一件從頭到尾不讓進度條出現', () => {
    const { visible, beginWaiting } = useRequestActivity()

    const end = beginWaiting()
    vi.advanceTimersByTime(150)
    end()
    vi.advanceTimersByTime(1000)

    expect(visible.value).toBe(false)
  })

  it('兩件重疊、但都一眨眼就回來時，進度條也不出現', () => {
    const { visible, beginWaiting } = useRequestActivity()
    const endFirst = beginWaiting()
    vi.advanceTimersByTime(150)
    const endSecond = beginWaiting()
    vi.advanceTimersByTime(30)

    endFirst()
    endSecond()
    vi.advanceTimersByTime(1000)

    expect(visible.value).toBe(false)
  })

  it('同時等兩件時，第一件回來進度條還在，第二件回來才收', () => {
    const { visible, beginWaiting } = useRequestActivity()
    const endFirst = beginWaiting()
    const endSecond = beginWaiting()
    vi.advanceTimersByTime(200)

    endFirst()
    expect(visible.value).toBe(true)

    endSecond()
    expect(visible.value).toBe(false)
  })

  it('同一件的結束叫兩次只算一次——另一件還在等時進度條不收', () => {
    const { visible, beginWaiting } = useRequestActivity()
    const endFirst = beginWaiting()
    beginWaiting()
    vi.advanceTimersByTime(200)

    endFirst()
    endFirst()

    expect(visible.value).toBe(true)
  })

  it('全部結束之後再開始一件，又要等 200 毫秒才出現', () => {
    const { visible, beginWaiting } = useRequestActivity()
    const end = beginWaiting()
    vi.advanceTimersByTime(200)
    end()

    beginWaiting()
    vi.advanceTimersByTime(199)
    expect(visible.value).toBe(false)

    vi.advanceTimersByTime(1)
    expect(visible.value).toBe(true)
  })

  it('兩個地方取用的是同一份——報到的那一層與畫進度條的那一條不必互相認識', () => {
    const { beginWaiting } = useRequestActivity()
    const { visible } = useRequestActivity()

    beginWaiting()
    vi.advanceTimersByTime(200)

    expect(visible.value).toBe(true)
  })
})

describe('useRequestActivity 換頁也走一次', () => {
  // 每個案例從乾淨的共用狀態開始，再接上換頁的那幾聲——與應用程式的根一樣只接一次。
  // 前一個案例接上的那一份仍然掛著，但它寫的是已經被清掉的那一份狀態，這裡讀不到。
  beforeEach(() => {
    clearNuxtState()
    vi.useFakeTimers()
    useRequestActivity().followNavigation()
  })

  afterEach(async () => {
    await useNuxtApp().callHook('page:loading:end')
    vi.useRealTimers()
  })

  it('換頁開始後超過門檻時進度條出現，換完了就收', async () => {
    const { visible } = useRequestActivity()

    await useNuxtApp().callHook('page:loading:start')
    vi.advanceTimersByTime(200)
    expect(visible.value).toBe(true)

    await useNuxtApp().callHook('page:loading:end')
    expect(visible.value).toBe(false)
  })

  it('換到一半又換一次，仍然只算一件——換完了就收', async () => {
    const { visible } = useRequestActivity()

    await useNuxtApp().callHook('page:loading:start')
    await useNuxtApp().callHook('page:loading:start')
    vi.advanceTimersByTime(200)
    await useNuxtApp().callHook('page:loading:end')

    expect(visible.value).toBe(false)
  })

  it('換頁到一半出錯也算結束，進度條不會一直跑', async () => {
    const { visible } = useRequestActivity()

    await useNuxtApp().callHook('page:loading:start')
    vi.advanceTimersByTime(200)
    await useNuxtApp().callHook('vue:error', new Error('壞了'), null, '')

    expect(visible.value).toBe(false)
  })

  it('換頁中又有一發請求在等時，換完了進度條還在', async () => {
    const { visible, beginWaiting } = useRequestActivity()
    const endRequest = beginWaiting()

    await useNuxtApp().callHook('page:loading:start')
    vi.advanceTimersByTime(200)
    await useNuxtApp().callHook('page:loading:end')
    expect(visible.value).toBe(true)

    endRequest()
    expect(visible.value).toBe(false)
  })
})
