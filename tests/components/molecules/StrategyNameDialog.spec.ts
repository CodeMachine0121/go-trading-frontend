import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyNameDialog from '~/components/molecules/StrategyNameDialog.vue'

function mountNameDialog(props: Record<string, unknown> = {}) {
  return mount(StrategyNameDialog, {
    props: {
      open: true,
      title: '另存為新策略',
      hint: '其餘內容取自畫面上目前的算式、指標值種類、彙總刻度與計算根數。',
      ...props,
    },
  })
}

describe('StrategyNameDialog', () => {
  it('只問名稱一件事', () => {
    const wrapper = mountNameDialog()

    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.text()).toContain('其餘內容取自畫面上目前的算式')
  })

  it('填了名字送出時把去掉前後空白的名字交出去', async () => {
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('　二十根均線　')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['二十根均線']])
  })

  it.each([
    { name: '完全沒填', typed: '' },
    { name: '只有空白字元', typed: '   ' },
  ])('名稱$name時不送出，就地說明要填', async ({ typed }) => {
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue(typed)

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.get('[data-testid="field-error"]').text()).toBe('請填寫策略名稱')
  })

  it('名稱被佔用時就地顯示，而且輸入框裡的字還在', async () => {
    // 把使用者剛打的名字清掉重來，是最容易惹人生氣的做法。
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('二十根均線')
    await wrapper.setProps({ errorMessage: '策略名稱「二十根均線」已被使用' })

    expect(wrapper.get('[data-testid="field-error"]').text())
      .toBe('策略名稱「二十根均線」已被使用')
    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('二十根均線')
  })

  it('重新打開時從空白開始——上一次留下的名字對這一次沒有意義', async () => {
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('舊的名字')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('')
  })

  it('改名時框裡先放著現在的名字，不必重打一次', () => {
    const wrapper = mountNameDialog({ title: '重新命名', initialName: '二十根均線' })

    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('二十根均線')
  })

  it('重新打開時回到這一次該有的起點', async () => {
    const wrapper = mountNameDialog({ title: '重新命名', initialName: '二十根均線' })
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('打到一半的字')
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(wrapper.get<HTMLInputElement>('[data-testid="strategy-name-input"]').element.value)
      .toBe('二十根均線')
  })

  it('標題與說明由使用端決定——同一個對話框服務另存與改名', () => {
    const wrapper = mountNameDialog({ title: '重新命名', hint: '只換名字。' })

    expect(wrapper.text()).toContain('重新命名')
    expect(wrapper.text()).toContain('只換名字。')
  })

  it('儲存中時不讓再按一次', () => {
    const wrapper = mountNameDialog({ submitting: true })

    expect(wrapper.get('[data-testid="strategy-name-submit"]').attributes('disabled'))
      .toBeDefined()
  })

  it('取消就是取消', async () => {
    const wrapper = mountNameDialog()

    await wrapper.findAll('button').filter(button => button.text() === '取消')[0]?.trigger('click')

    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
