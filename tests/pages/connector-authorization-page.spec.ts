import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ConnectorAuthorizationPage from '~/pages/connector-authorization.vue'
import ConnectorAuthorizationPanel from '~/components/organisms/ConnectorAuthorizationPanel.vue'
import { SignedInUserDto } from '~/domain/models/dto/signed-in-user-dto'

const { routeQuery, load } = vi.hoisted(() => ({
  routeQuery: { value: {} as Record<string, string | string[] | undefined> },
  load: vi.fn(),
}))

mockNuxtImport('useRoute', () => () => ({ query: routeQuery.value }))
mockNuxtImport('useConnectorAuthorization', () => () => ({
  stage: ref('loading'),
  authorizationRequest: ref(null),
  pendingDecision: ref(null),
  loadErrorMessage: ref(null),
  decisionErrorMessage: ref(null),
  load,
  retry: vi.fn(),
  approve: vi.fn(),
  deny: vi.fn(),
}))
mockNuxtImport('useUserSession', () => () => ({
  currentUser: ref(new SignedInUserDto(7, 'james@example.com', true, null)),
}))

function mountPage() {
  return mount(ConnectorAuthorizationPage, {
    global: { stubs: { ConnectorAuthorizationPanel: true } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('外掛授權同意頁', () => {
  it('打開時讀取網址上的那一張授權請求', () => {
    routeQuery.value = { request: 'abc' }

    mountPage()

    expect(load).toHaveBeenCalledWith('abc')
  })

  it.each([
    { name: '沒帶授權請求', query: {} },
    { name: '授權請求重複出現', query: { request: ['abc', 'def'] } },
  ])('$name 時當成沒有授權請求', ({ query }) => {
    routeQuery.value = query

    mountPage()

    expect(load).toHaveBeenCalledWith('')
  })

  it('把目前登入的帳號交給卡片', () => {
    routeQuery.value = { request: 'abc' }

    const wrapper = mountPage()

    expect(wrapper.findComponent(ConnectorAuthorizationPanel).props('email')).toBe('james@example.com')
  })
})
