import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyBotBlockDock from '~/components/organisms/StrategyBotBlockDock.vue'
import { ConditionBlockDrawerDto } from '~/domain/models/dto/condition-block-drawer-dto'
import { ConditionBlockOptionDto } from '~/domain/models/dto/condition-block-option-dto'
import { ConditionBlockVo } from '~/domain/models/vo/condition-block-vo'

function aDrawer() {
  return new ConditionBlockDrawerDto(
    [new ConditionBlockOptionDto(
      new ConditionBlockVo('comparison', 'A', null), 'A 等於…', true, '')],
    [new ConditionBlockOptionDto(
      new ConditionBlockVo('group', '', 'and'), '全部成立（且）', true, '')],
    '',
  )
}

function mountDock() {
  return mount(StrategyBotBlockDock, { props: { drawer: aDrawer() } })
}

function isOpen(wrapper: ReturnType<typeof mountDock>) {
  return wrapper.classes().includes('block-dock--open')
}

// 這個抽屜只有一條規則：**人在上面就開著，離開就收起來。**
//
// 它一路試出來的：每多一個撐開它的理由（釘住、選著一個空位、正在拖），
// 就多一個「那個理由消失時誰負責放手」的問題，而漏掉任何一個，
// 使用者看到的就是一個收不回去的抽屜。所以這裡每一條問的都是同一件事。
describe('StrategyBotBlockDock', () => {
  it('一開始收著——它貼在畫面邊緣，不是版面的一部分', () => {
    expect(isOpen(mountDock())).toBe(false)
  })

  it('滑鼠碰到右緣就出來', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-edge"]').trigger('mouseenter')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('滑鼠碰到把手也出來', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-handle"]').trigger('mouseenter')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('用鍵盤走到把手上也出來——他們沒有滑鼠可以滑過去', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-handle"]').trigger('focus')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('滑鼠離開就收回去', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-edge"]').trigger('mouseenter')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('按了把手也不會留著——這裡沒有任何一種釘住', async () => {
    // 留得住的話，就又回到「誰負責把它收起來」那個問題。
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-handle"]').trigger('mouseenter')
    await wrapper.get('[data-testid="block-dock-handle"]').trigger('click')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('點一塊放進去之後，滑鼠一離開它就收', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseenter')
    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('click')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('開始拖一塊就收起來——瀏覽器不會告訴它滑鼠已經走了', async () => {
    // 拖曳期間 mouseleave 不發，所以抽屜自己看不到使用者把積木帶走。
    // 收起來也更好：手上抓著積木時要看的是**要放到哪裡**，不是抽屜裡還有什麼。
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseenter')
    expect(isOpen(wrapper)).toBe(true)

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', {
      dataTransfer: { setData: vi.fn() } as unknown as DataTransfer,
    })

    expect(isOpen(wrapper)).toBe(false)
  })

  it('把手說得出現在是開還是關，給看不到畫面的人', async () => {
    const wrapper = mountDock()

    expect(wrapper.get('[data-testid="block-dock-handle"]').attributes('aria-expanded'))
      .toBe('false')

    await wrapper.get('[data-testid="block-dock-edge"]').trigger('mouseenter')

    expect(wrapper.get('[data-testid="block-dock-handle"]').attributes('aria-expanded'))
      .toBe('true')
  })

  it('點一塊與拖一塊都往上傳，它自己不處理', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('click')
    await wrapper.get('[data-testid="block-comparison:A:"]').trigger('dragstart', {
      dataTransfer: { setData: vi.fn() } as unknown as DataTransfer,
    })

    expect(wrapper.emitted('pick')).toBeTruthy()
    expect(wrapper.emitted('dragStart')).toBeTruthy()
  })
})
