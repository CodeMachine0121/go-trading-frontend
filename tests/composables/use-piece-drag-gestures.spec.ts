import { defineComponent, h, ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePieceDrag } from '~/composables/use-piece-drag'
import { usePieceDragGestures } from '~/composables/use-piece-drag-gestures'

const stopWatchingPieces = vi.fn()
const stopWatchingDropZones = vi.fn()
const watchPieces = vi.fn(() => ({ unset: stopWatchingPieces }))
const watchDropZones = vi.fn(() => ({ unset: stopWatchingDropZones }))

/**
 * 手勢那一層唯一的邊界就是 interact.js，所以只有它是替身。
 *
 * 這幾條問的不是「拖曳算得對不對」（那住在 usePieceDrag），
 * 而是**到底有沒有掛在那些零件上**——而那件事從畫面上完全看不出來。
 */
vi.mock('interactjs', () => {
  const interact = vi.fn(() => ({ draggable: watchPieces, dropzone: watchDropZones }))

  return {
    default: Object.assign(interact, {
      pointerMoveTolerance: vi.fn(),
      dynamicDrop: vi.fn(),
    }),
  }
})

function benchWhere(editable: ReturnType<typeof ref<boolean>>) {
  const Bench = defineComponent({
    setup() {
      const pieceDrag = usePieceDrag(vi.fn(), vi.fn(), vi.fn())
      const { benchElement } = usePieceDragGestures(pieceDrag, () => editable.value === true)

      return () => h('div', { ref: benchElement })
    },
  })

  return mount(Bench, { attachTo: document.body })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('usePieceDragGestures', () => {
  it('編得動的時候才掛手勢', async () => {
    benchWhere(ref(true))
    await flushPromises()

    expect(watchPieces).toHaveBeenCalledTimes(1)
    expect(watchDropZones).toHaveBeenCalledTimes(1)
  })

  it('編不動就一個手勢都不掛', async () => {
    // 掛上去再擋是另一回事：那樣仍然攔得到觸控，於是使用者在一張改不動的
    // 工作檯上連頁面都捲不動——他會以為畫面當掉了。
    benchWhere(ref(false))
    await flushPromises()

    expect(watchPieces).not.toHaveBeenCalled()
    expect(watchDropZones).not.toHaveBeenCalled()
  })

  it('使用中變得編不動了，手勢就收回來', async () => {
    const editable = ref(true)
    benchWhere(editable)
    await flushPromises()

    editable.value = false
    await flushPromises()

    expect(stopWatchingPieces).toHaveBeenCalledTimes(1)
    expect(stopWatchingDropZones).toHaveBeenCalledTimes(1)
  })

  it('再變得編得動，手勢要回得來', async () => {
    // 一台平板從直的轉成橫的，就是這條路。回不來的話，它只是靜靜地拖不動。
    const editable = ref(true)
    benchWhere(editable)
    await flushPromises()

    editable.value = false
    await flushPromises()
    editable.value = true
    await flushPromises()

    expect(watchPieces).toHaveBeenCalledTimes(2)
    expect(watchDropZones).toHaveBeenCalledTimes(2)
  })

  it('還在載入的半路上就變得編不動，那一次掛載要放棄', async () => {
    // 那一段是一個 await。掛上去的話沒有人會來收它——要它收手的那一句話
    // 在它掛上去之前就已經說完了。
    const editable = ref(true)
    benchWhere(editable)

    editable.value = false
    await flushPromises()

    expect(watchPieces).not.toHaveBeenCalled()
  })

  it('還在載入的半路上就離開這一頁，那一次掛載也要放棄', async () => {
    const wrapper = benchWhere(ref(true))

    wrapper.unmount()
    await flushPromises()

    expect(watchPieces).not.toHaveBeenCalled()
  })

  it('離開這一頁就收回來', async () => {
    const wrapper = benchWhere(ref(true))
    await flushPromises()

    wrapper.unmount()

    expect(stopWatchingPieces).toHaveBeenCalledTimes(1)
    expect(stopWatchingDropZones).toHaveBeenCalledTimes(1)
  })
})
