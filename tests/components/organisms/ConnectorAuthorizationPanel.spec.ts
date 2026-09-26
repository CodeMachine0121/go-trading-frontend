import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ConnectorAuthorizationPanel from '~/components/organisms/ConnectorAuthorizationPanel.vue'
import { ConnectorAuthorizationRequestDto } from '~/domain/models/dto/connector-authorization-request-dto'

type PanelProps = InstanceType<typeof ConnectorAuthorizationPanel>['$props']

function mountPanel(props: Partial<PanelProps> = {}) {
  return mount(ConnectorAuthorizationPanel, {
    props: {
      stage: 'awaitingDecision',
      authorizationRequest: new ConnectorAuthorizationRequestDto('Claude Code'),
      email: 'james@example.com',
      ...props,
    },
  })
}

describe('ConnectorAuthorizationPanel：等他決定', () => {
  it('說清楚外掛名稱、目前帳號與授權範圍', () => {
    const wrapper = mountPanel()

    expect(wrapper.get('[data-testid="authorization-client-name"]').text()).toBe('Claude Code')
    expect(wrapper.get('[data-testid="authorization-email"]').text()).toBe('james@example.com')
    expect(wrapper.get('[data-testid="authorization-scope"]').text())
      .toContain('允許後，它能以你的身分使用交易服務的全部功能')
    expect(wrapper.get('[data-testid="authorization-approve"]').text()).toBe('允許')
    expect(wrapper.get('[data-testid="authorization-deny"]').text()).toBe('拒絕')
  })

  it.each([
    { testId: 'authorization-approve', event: 'approve' },
    { testId: 'authorization-deny', event: 'deny' },
  ] as const)('按下 $testId 往上說 $event', async ({ testId, event }) => {
    const wrapper = mountPanel()

    await wrapper.get(`[data-testid="${testId}"]`).trigger('click')

    expect(wrapper.emitted(event)).toHaveLength(1)
  })

  it.each([
    { pendingDecision: 'approve', approveLabel: '允許中…', denyLabel: '拒絕' },
    { pendingDecision: 'deny', approveLabel: '允許', denyLabel: '拒絕中…' },
  ] as const)('送出 $pendingDecision 時兩個選擇都停用，按下的那一個顯示進行中', ({ pendingDecision, approveLabel, denyLabel }) => {
    const wrapper = mountPanel({ pendingDecision })

    const approveButton = wrapper.get('[data-testid="authorization-approve"]')
    const denyButton = wrapper.get('[data-testid="authorization-deny"]')
    expect(approveButton.attributes('disabled')).toBeDefined()
    expect(denyButton.attributes('disabled')).toBeDefined()
    expect(approveButton.text()).toBe(approveLabel)
    expect(denyButton.text()).toBe(denyLabel)
  })

  it('決定失敗時說明原因，選擇仍可按', () => {
    const wrapper = mountPanel({ decisionErrorMessage: '連不上交易服務' })

    expect(wrapper.get('[data-testid="authorization-decision-error"]').text()).toBe('連不上交易服務')
    expect(wrapper.get('[data-testid="authorization-approve"]').attributes('disabled')).toBeUndefined()
  })
})

describe('ConnectorAuthorizationPanel：其他結局', () => {
  it.each([
    { stage: 'loading', testId: 'authorization-loading', text: '正在讀取授權請求…' },
    { stage: 'expired', testId: 'authorization-expired', text: '這一張授權請求已失效或已被使用，請回到 Claude Code 重新連線。' },
    { stage: 'handedBack', testId: 'authorization-handed-back', text: '可以關掉這個分頁，回到 Claude Code' },
  ] as const)('$stage 時說「$text」，而且沒有允許與拒絕', ({ stage, testId, text }) => {
    const wrapper = mountPanel({ stage })

    expect(wrapper.get(`[data-testid="${testId}"]`).text()).toContain(text)
    expect(wrapper.find('[data-testid="authorization-approve"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="authorization-deny"]').exists()).toBe(false)
  })

  it('讀取失敗時說明原因並給再試一次，沒有允許與拒絕', async () => {
    const wrapper = mountPanel({ stage: 'loadFailed', loadErrorMessage: '連不上交易服務' })

    expect(wrapper.get('[data-testid="authorization-load-failed"]').text()).toContain('連不上交易服務')
    expect(wrapper.find('[data-testid="authorization-approve"]').exists()).toBe(false)
    await wrapper.get('[data-testid="authorization-retry"]').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })
})
