import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import StrategyNameDialog from '~/components/molecules/StrategyNameDialog.vue'

function mountNameDialog(props: Record<string, unknown> = {}) {
  return mount(StrategyNameDialog, {
    props: {
      open: true,
      title: '另存為新策略',
      hint: '其餘內容取自畫面上目前的算式、指標值種類與參數。',
      ...props,
    },
  })
}

describe('StrategyNameDialog', () => {
  it('問的就是那兩件事：叫什麼、做什麼', () => {
    // 說明與名稱一起問，因為它們一起被想到。分成兩步只會讓大部分人跳過第二步，
    // 而分享到市集之後，那一步是別人唯一的介紹。
    const wrapper = mountNameDialog()

    expect(wrapper.findAll('input')).toHaveLength(1)
    expect(wrapper.find('[data-testid="strategy-description-input"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('其餘內容取自畫面上目前的算式')
  })

  it('填了名字送出時把去掉前後空白的名字交出去', async () => {
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('　二十根均線　')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['二十根均線', '']])
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

describe('StrategyNameDialog：說明', () => {
  it('說明與名字一起交出去', async () => {
    // 兩者一起被想到（「這是什麼、它做什麼」），所以一起問、一起送。
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('二十根均線')
    await wrapper.get('[data-testid="strategy-description-input"]').setValue('抓短線轉折')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['二十根均線', '抓短線轉折']])
  })

  it('說明留空也送得出去——沒有說明是一個合法的答案', async () => {
    const wrapper = mountNameDialog()
    await wrapper.get('[data-testid="strategy-name-input"]').setValue('二十根均線')

    await wrapper.get('[data-testid="strategy-name-submit"]').trigger('click')

    expect(wrapper.emitted('submit')).toEqual([['二十根均線', '']])
  })

  it('每次打開都從這一次該有的起點開始，不留上一次打的說明', async () => {
    const wrapper = mountNameDialog({ initialDescription: '原本的說明' })
    await wrapper.get('[data-testid="strategy-description-input"]').setValue('改到一半的')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect((wrapper.get('[data-testid="strategy-description-input"]')
      .element as HTMLTextAreaElement).value).toBe('原本的說明')
  })
})
