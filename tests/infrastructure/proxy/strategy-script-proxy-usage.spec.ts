import { createFetchError, type FetchContext } from 'ofetch'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrategyScriptProxy } from '~/infrastructure/proxy/strategy-script-proxy'
import { StrategyScriptMarketplaceProxy } from '~/infrastructure/proxy/strategy-script-marketplace-proxy'
import { signedInSessionStorage } from '../../fixtures/session-storage'
import { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { StrategyScriptContentDto } from '~/domain/models/dto/strategy-script-content-dto'
import { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyScriptNameConflictError } from '~/domain/errors/strategy-script-name-conflict-error'
import type { StrategyScriptUsage } from '~/domain/models/vo/strategy-script-usage-vo'

const BASE_URL = 'http://localhost:8080'

function scriptWire(overrides: Record<string, unknown> = {}) {
  return { id: 5, name: '均線', script: 'sum := 0.0', resultType: 'floatList', ...overrides }
}

function writeDomainOf(id: number | undefined, usage: StrategyScriptUsage | null) {
  return new StrategyScriptWriteDomain(new StrategyScriptWriteDto(
    '均線', new StrategyScriptContentDto('sum := 0.0', 'floatList'), id, '', usage))
}

function proxy() {
  return new StrategyScriptProxy(BASE_URL, signedInSessionStorage())
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('StrategyScriptProxy 新增時說用途、改寫時不說', () => {
  it.each([
    { usage: 'chart' as const },
    { usage: 'calculation' as const },
  ])('另存一支 $usage 的新腳本，送出的用途是 $usage', async ({ usage }) => {
    const fetchMock = vi.fn().mockResolvedValue(scriptWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().createStrategyScript(writeDomainOf(undefined, usage))

    expect(fetchMock.mock.calls[0]![1].body.usage).toBe(usage)
  })

  it('改寫一支既有的，就算帶著用途也不送', async () => {
    const fetchMock = vi.fn().mockResolvedValue(scriptWire())
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().updateStrategyScript(writeDomainOf(5, 'chart'))

    expect(fetchMock.mock.calls[0]![1].body).not.toHaveProperty('usage')
  })
})

describe('StrategyScriptProxy 切換用途', () => {
  it('對那一支送出要切成的用途', async () => {
    const fetchMock = vi.fn().mockResolvedValue(scriptWire({ usage: 'chart' }))
    vi.stubGlobal('$fetch', fetchMock)

    await proxy().switchStrategyScriptUsage(5, 'chart')

    expect(fetchMock.mock.calls[0]![0]).toBe(`${BASE_URL}/strategy-scripts/5/usage`)
    expect(fetchMock.mock.calls[0]![1].method).toBe('PUT')
    expect(fetchMock.mock.calls[0]![1].body).toEqual({ usage: 'chart' })
  })

  it('被交易策略用著時照交易服務那一句往上，不當成撞名', async () => {
    const message = '交易策略「4H 趨勢」正在用這支腳本'
    vi.stubGlobal('$fetch', vi.fn().mockRejectedValue(createFetchError({
      request: BASE_URL,
      options: {},
      response: { status: 409, statusText: 'conflict', _data: { message, reason: 'strategyScriptUsageInUse' } },
    } as unknown as FetchContext)))

    const switching = proxy().switchStrategyScriptUsage(5, 'chart')

    await expect(switching).rejects.toBeInstanceOf(BackendRequestRejectedError)
    await expect(switching).rejects.not.toBeInstanceOf(StrategyScriptNameConflictError)
    await expect(switching).rejects.toMatchObject({ message })
  })
})

describe('StrategyScriptProxy 讀回用途', () => {
  it('自己的與市集副本各讀它們自己的用途；沒說的是計算用', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue({
      mine: [scriptWire({ id: 1, usage: 'chart' }), scriptWire({ id: 2 })],
      adopted: [{ id: 9, name: '副本', resultType: 'signal', script: '', usage: 'chart' }, { id: 10, name: '舊副本', resultType: 'signal', script: '' }],
    }))

    const available = await proxy().listAvailableStrategyScripts()

    expect(available.mine.map(script => script.toDomain().toDto().usage.label.in('zh-TW'))).toEqual(['圖表用', '計算用'])
    expect(available.adopted.map(script => script.toDomain().toDto().usage.label.in('zh-TW'))).toEqual(['圖表用', '計算用'])
  })

  it('市集上每一支讀它目前的用途；沒說的是計算用', async () => {
    const published = { name: '別人的', resultType: 'float', publisherEmail: 'a@example.com', publishedAt: '2026-09-10T08:00:00.000Z' }
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValue([
      { ...published, id: 1, usage: 'chart' },
      { ...published, id: 2, usage: 'calculation' },
      { ...published, id: 3 },
    ]))

    const marketplace = await new StrategyScriptMarketplaceProxy(BASE_URL, signedInSessionStorage()).browseMarketplace()

    expect(marketplace.map(entry => entry.toDomain().toDto().usage.label.in('zh-TW'))).toEqual(['圖表用', '計算用', '計算用'])
  })
})
