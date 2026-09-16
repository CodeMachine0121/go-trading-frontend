import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
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

function mountDock(overrides: { dragActive?: boolean, holeSelected?: boolean } = {}) {
  return mount(StrategyBotBlockDock, {
    props: {
      drawer: aDrawer(),
      dragActive: overrides.dragActive ?? false,
      holeSelected: overrides.holeSelected ?? false,
    },
  })
}

function isOpen(wrapper: ReturnType<typeof mountDock>) {
  return wrapper.get('[data-testid="block-dock-panel"]').classes()
    .some(className => className.endsWith('block-dock__panel'))
    && wrapper.classes().includes('block-dock--open')
}

describe('StrategyBotBlockDock 什麼時候出來', () => {
  it('一開始收著——它貼在畫面邊緣，不是版面的一部分', () => {
    // 待在版面裡的話它會被樹推走：條件愈拼愈長，它就愈往下掉，
    // 偏偏它是每一步都要用到的東西。
    expect(isOpen(mountDock())).toBe(false)
  })

  it('滑鼠碰到右緣就出來', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-edge"]').trigger('mouseenter')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('滑鼠移開就自己收回去', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-edge"]').trigger('mouseenter')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('按了把手就留著，滑鼠移開也不收', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-handle"]').trigger('click')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('再按一次把手就放它走', async () => {
    const wrapper = mountDock()

    await wrapper.get('[data-testid="block-dock-handle"]').trigger('click')
    await wrapper.get('[data-testid="block-dock-handle"]').trigger('click')
    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(false)
  })

  it('拖到一半一定開著——手上還抓著東西時把它收走最難解釋', async () => {
    // 抽屜靠滑過去打開的話，使用者從裡面拖一塊出來的那一瞬間滑鼠就離開了它。
    const wrapper = mountDock({ dragActive: true })

    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('選著一個空位時也一定開著——那一刻他要的就是有什麼可以放進去', async () => {
    // 他剛剛點的那個空位可能在畫面的另一頭，離右緣很遠。
    const wrapper = mountDock({ holeSelected: true })

    await wrapper.get('[data-testid="block-dock-panel"]').trigger('mouseleave')

    expect(isOpen(wrapper)).toBe(true)
  })

  it('把手說得出現在是開還是關，給看不到畫面的人', () => {
    const wrapper = mountDock({ holeSelected: true })

    expect(wrapper.get('[data-testid="block-dock-handle"]').attributes('aria-expanded'))
      .toBe('true')
  })
})

describe('StrategyBotBlockDock 把抽屜的事往上傳', () => {
  it('點一塊就往上傳，不自己處理', () => {
    const wrapper = mountDock({ holeSelected: true })

    wrapper.get('[data-testid="block-comparison:A:"]').trigger('click')

    expect(wrapper.emitted('pick')).toBeTruthy()
  })
})
