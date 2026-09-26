import { afterEach, describe, expect, it, vi } from 'vitest'
import { ExternalNavigationProxy } from '~/infrastructure/proxy/external-navigation-proxy'
import { ConnectorReturnAddressVo } from '~/domain/models/vo/connector-return-address-vo'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ExternalNavigationProxy.leaveFor', () => {
  it('整頁離開操作台，前往給的位址', () => {
    const assign = vi.fn()
    vi.stubGlobal('location', { assign })

    new ExternalNavigationProxy().leaveFor(
      new ConnectorReturnAddressVo('http://127.0.0.1:33418/callback?code=one-time'))

    expect(assign).toHaveBeenCalledWith('http://127.0.0.1:33418/callback?code=one-time')
  })
})
