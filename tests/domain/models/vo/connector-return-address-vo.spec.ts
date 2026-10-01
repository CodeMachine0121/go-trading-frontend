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
    'https://claude.ai/api/mcp/auth_callback?code=one-time&state=xyz',
    'https://claude.com/api/mcp/auth_callback?code=one-time&state=xyz',
  ])('接受雲端外掛的信任返回位址 %s', (candidateAddress) => {
    expect(new ConnectorReturnAddressVo(candidateAddress).address).toBe(candidateAddress)
  })

  it.each([
    { reason: 'javascript: 位址', candidateAddress: 'javascript:alert(document.cookie)' },
    { reason: '外部網站', candidateAddress: 'https://evil.example/callback' },
    { reason: '外部網站的 http', candidateAddress: 'http://evil.example/callback' },
    { reason: '本機但不是 http', candidateAddress: 'https://localhost:33418/callback' },
    { reason: '借本機名稱當帳號的外部網站', candidateAddress: 'http://localhost@evil.example/callback' },
    { reason: '看起來像本機的外部網域', candidateAddress: 'http://127.0.0.1.evil.example/callback' },
    { reason: '信任網域的其他路徑', candidateAddress: 'https://claude.ai/api/mcp/other?code=one-time' },
    { reason: '信任位址改用 http', candidateAddress: 'http://claude.ai/api/mcp/auth_callback?code=one-time' },
    { reason: '信任位址帶其他 port', candidateAddress: 'https://claude.ai:8443/api/mcp/auth_callback?code=one-time' },
    { reason: '信任位址帶帳號', candidateAddress: 'https://user@claude.ai/api/mcp/auth_callback?code=one-time' },
    { reason: '信任位址帶片段', candidateAddress: 'https://claude.ai/api/mcp/auth_callback#code=one-time' },
    { reason: '借信任網域當子網域的外部網站', candidateAddress: 'https://claude.ai.evil.example/api/mcp/auth_callback' },
    { reason: '不是位址', candidateAddress: 'not an address' },
    { reason: '空字串', candidateAddress: '' },
    { reason: '沒給', candidateAddress: undefined },
  ])('拒絕$reason', ({ candidateAddress }) => {
    expect(() => new ConnectorReturnAddressVo(candidateAddress))
      .toThrow(ConnectorReturnAddressRejectedError)
  })
})
