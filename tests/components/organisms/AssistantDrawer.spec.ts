// @vitest-environment nuxt
// 訊息底下那顆複製鍵問的是組裝根注入的剪貼簿，所以這一份要跑在 Nuxt runtime 裡。
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import AssistantDrawer from '~/components/organisms/AssistantDrawer.vue'
import type { ConversationMessageDto } from '~/domain/models/dto/conversation-message-dto'
import { SUGGESTED_PROMPTS, buildMessage, buildNote, buildSummary } from '../../fixtures/assistant-conversation'
import { buildTimeZone } from '../../fixtures/time-zone'

function mountDrawer(props: {
  open: boolean
  messages?: ConversationMessageDto[]
  pending?: boolean
  draft?: string
  conversations?: ReturnType<typeof buildSummary>[]
  activeConversationId?: number | null
  conversationsErrorMessage?: string | null
  width?: number
  resizing?: boolean
}) {
  return mount(AssistantDrawer, {
    props: {
      open: props.open,
      messages: props.messages ?? [],
      pending: props.pending ?? false,
      rejectionMessage: null,
      suggestedPrompts: SUGGESTED_PROMPTS,
      timeZone: buildTimeZone(),
      draft: props.draft ?? '',
      conversations: props.conversations ?? [],
      activeConversationId: props.activeConversationId ?? null,
      conversationsErrorMessage: props.conversationsErrorMessage ?? null,
      width: props.width ?? 420,
      resizing: props.resizing ?? false,
    },
    global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
  })
}

describe('AssistantDrawer 收起來的時候', () => {
  it('什麼都不畫', () => {
    // 叫出它的那一顆鍵不在這裡：它可以被拖到任何地方，而抽屜永遠靠右——
    // 一塊 420 像素的面板跟著一顆鍵到處跑，會在半數位置把它自己推出視窗。
    const wrapper = mountDrawer({ open: false })

    expect(wrapper.find('[data-testid="assistant-drawer-panel"]').exists()).toBe(false)
  })
})

describe('AssistantDrawer 打開的時候', () => {
  it('顯示對話串與輸入框', () => {
    const wrapper = mountDrawer({
      open: true,
      messages: [buildMessage('answer', '在盤整。', buildNote())],
    })

    expect(wrapper.find('[data-testid="assistant-drawer-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-message-answer"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-composer-input"]').exists()).toBe(true)
  })

  it('清單不是常駐的第二欄——420 像素硬塞兩欄的結果是兩邊都難用', () => {
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })

    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-drawer-history-toggle"]').exists()).toBe(true)
  })

  it('標頭的展開通往整頁，那是換對話的去處', () => {
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.get('[data-testid="assistant-drawer-expand"]').attributes('to'))
      .toBe('/chat')
  })

  it('收起來交得出去', async () => {
    const wrapper = mountDrawer({ open: true })

    await wrapper.get('[data-testid="assistant-drawer-close"]').trigger('click')

    expect(wrapper.emitted('closeDrawer')).toHaveLength(1)
  })

  it('送出時把那一句交出去', async () => {
    const wrapper = mountDrawer({ open: true, draft: 'BTCUSDT 最近走勢如何' })

    await wrapper.get('form').trigger('submit')

    expect(wrapper.emitted('send')).toEqual([['BTCUSDT 最近走勢如何']])
  })

  it('點建議提問也走同一條送出的路', async () => {
    const wrapper = mountDrawer({ open: true })

    await wrapper.findAll('[data-testid="assistant-suggested-prompt"]')[0]?.trigger('click')

    expect(wrapper.emitted('send')).toEqual([[SUGGESTED_PROMPTS[0]]])
  })

  it('等待中輸入框鎖住', () => {
    const wrapper = mountDrawer({ open: true, pending: true, draft: '問一句' })

    expect(wrapper.get('[data-testid="assistant-composer-input"]').attributes('disabled'))
      .toBeDefined()
  })
})

describe('AssistantDrawer 在抽屜裡換對話', () => {
  it('標頭一直看得到開新對話與歷史', () => {
    // 開新對話是常做的事，所以它一直在；歷史是偶爾翻的，所以它是一顆開關。
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.find('[data-testid="assistant-drawer-start-new"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-drawer-history-toggle"]').exists()).toBe(true)
  })

  it('按開新對話就交出去，並且不會停在歷史那一層', async () => {
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })
    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    await wrapper.get('[data-testid="assistant-drawer-start-new"]').trigger('click')

    expect(wrapper.emitted('startNew')).toHaveLength(1)
    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(false)
  })

  it('打開歷史才去讀清單——沒人翻歷史時那是一次白打的請求', async () => {
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.emitted('openHistory')).toBeUndefined()

    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    expect(wrapper.emitted('openHistory')).toHaveLength(1)
  })

  it('歷史那一層蓋掉對話與輸入框', async () => {
    // 420 像素放不下兩欄，所以它是蓋上來的一層，不是擠在旁邊的第二欄。
    const wrapper = mountDrawer({
      open: true,
      messages: [buildMessage('answer', '在盤整。', buildNote())],
      conversations: [buildSummary(7)],
    })

    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="assistant-message-answer"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-composer-input"]').exists()).toBe(false)
  })

  it('歷史那一層不再放一顆開新的——標頭已經有了', async () => {
    // 同一個動作兩個入口，遲早會有一個被改壞。
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })

    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    expect(wrapper.find('[data-testid="assistant-list-start-new"]').exists()).toBe(false)
  })

  it('挑一段就交出它的識別碼，並收起那一層', async () => {
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })
    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    await wrapper.get('[data-testid="assistant-list-item-7"]').trigger('click')

    expect(wrapper.emitted('selectConversation')).toEqual([[7]])
    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(false)
  })

  it('再按一次歷史就收起來', async () => {
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })
    const toggle = wrapper.get('[data-testid="assistant-drawer-history-toggle"]')

    await toggle.trigger('click')
    await toggle.trigger('click')

    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(false)
  })

  it('收起抽屜再打開時先看到對話，不是上次翻到一半的歷史', async () => {
    const wrapper = mountDrawer({ open: true, conversations: [buildSummary(7)] })
    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(wrapper.find('[data-testid="assistant-list-item-7"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="assistant-composer-input"]').exists()).toBe(true)
  })

  it('取不到清單時在那一層裡明說', async () => {
    const wrapper = mountDrawer({
      open: true,
      conversationsErrorMessage: '連不上後端 go-trading API',
    })

    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    expect(wrapper.get('[data-testid="assistant-list-error"]').text()).toContain('連不上後端')
  })
})

describe('AssistantDrawer 把裡面那兩塊的事件接出去', () => {
  it('對話串的再試一次交得出去', async () => {
    const wrapper = mount(AssistantDrawer, {
      props: {
        open: true,
        messages: [buildMessage('ask', '問一句')],
        pending: false,
        rejectionMessage: '助手目前沒有回應',
        suggestedPrompts: SUGGESTED_PROMPTS,
        timeZone: buildTimeZone(),
        draft: '',
        conversations: [],
        activeConversationId: null,
        conversationsErrorMessage: null,
        width: 420,
      },
      global: { stubs: { NuxtLink: { template: '<a><slot /></a>' } } },
    })

    await wrapper.get('[data-testid="assistant-rejection-retry"]').trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('歷史那一層的重新讀取也是去讀清單', async () => {
    const wrapper = mountDrawer({
      open: true,
      conversationsErrorMessage: '連不上後端 go-trading API',
    })
    await wrapper.get('[data-testid="assistant-drawer-history-toggle"]').trigger('click')

    await wrapper.get('[data-testid="assistant-list-reload"]').trigger('click')

    // 一次是打開那一層時讀的，一次是按重新讀取。
    expect(wrapper.emitted('openHistory')).toHaveLength(2)
  })
})

describe('AssistantDrawer 的寬度', () => {
  it('畫成外面說的那麼寬', () => {
    // 寬度不寫在樣式裡：夾回還能用的範圍那條規則要用到同一個數字，
    // 兩邊各寫一份的話，使用者拉到某個寬度時畫出來的會是另一個。
    const wrapper = mountDrawer({ open: true, width: 560 })

    expect(wrapper.get('[data-testid="assistant-drawer-panel"]').attributes('style'))
      .toContain('width: 560px')
  })

  it('左邊那條邊抓得住', () => {
    // 抽屜靠右，所以會動的是左邊那一條。
    const wrapper = mountDrawer({ open: true })

    expect(wrapper.find('[data-testid="assistant-drawer-resize-handle"]').exists()).toBe(true)
  })

  it('抓住那條邊就把游標的位置交出去', async () => {
    // 之後的移動與放手掛在 window 上——手一快就會離開那條細邊。
    const wrapper = mountDrawer({ open: true })

    await wrapper.get('[data-testid="assistant-drawer-resize-handle"]')
      .trigger('pointerdown', { clientX: 640 })

    expect(wrapper.emitted('resizeStart')).toEqual([[640]])
  })

  it('拉動中看得出來', () => {
    const wrapper = mountDrawer({ open: true, resizing: true })

    expect(wrapper.get('[data-testid="assistant-drawer-panel"]').classes())
      .toContain('assistant-drawer__panel--resizing')
  })

  it('說得出那條邊是幹什麼的', () => {
    // 一條五像素的細邊，對讀螢幕的人來說什麼都沒說。
    const handle = mountDrawer({ open: true })
      .get('[data-testid="assistant-drawer-resize-handle"]')

    expect(handle.attributes('aria-label')).toContain('調整助手寬度')
    expect(handle.attributes('role')).toBe('separator')
  })
})
