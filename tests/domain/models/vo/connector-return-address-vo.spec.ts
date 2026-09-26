import { describe, expect, it } from 'vitest'
import { ConnectorReturnAddressVo } from '~/domain/models/vo/connector-return-address-vo'
import { ConnectorReturnAddressRejectedError } from '~/domain/errors/connector-return-address-rejected-error'

describe('ConnectorReturnAddressVo', () => {
  it.each([
    'http://localhost:33418/callback?code=one-time&state=xyz',
    'http://127.0.0.1:33418/callback?code=one-time&state=xyz',
    'http://[::1]:33418/callback?code=one-time&state=xyz',
  ])('接受這台電腦上的外掛位址 %s', (candidateAddress) => {
    expect(new ConnectorReturnAddressVo(candidateAddress).address).toBe(candidateAddress)
  })

  it.each([
    { reason: 'javascript: 位址', candidateAddress: 'javascript:alert(document.cookie)' },
    { reason: '外部網站', candidateAddress: 'https://evil.example/callback' },
    { reason: '外部網站的 http', candidateAddress: 'http://evil.example/callback' },
    { reason: '本機但不是 http', candidateAddress: 'https://localhost:33418/callback' },
    { reason: '借本機名稱當帳號的外部網站', candidateAddress: 'http://localhost@evil.example/callback' },
    { reason: '看起來像本機的外部網域', candidateAddress: 'http://127.0.0.1.evil.example/callback' },
    { reason: '不是位址', candidateAddress: 'not an address' },
    { reason: '空字串', candidateAddress: '' },
    { reason: '沒給', candidateAddress: undefined },
  ])('拒絕$reason', ({ candidateAddress }) => {
    expect(() => new ConnectorReturnAddressVo(candidateAddress))
      .toThrow(ConnectorReturnAddressRejectedError)
  })
})
