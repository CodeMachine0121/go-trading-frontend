import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyMarketplacePanel from '~/components/organisms/StrategyMarketplacePanel.vue'
import type { IStrategyMarketplaceProxy } from '~/domain/interface/i-strategy-marketplace-proxy'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { PublishedStrategy } from '~/domain/models/entities/published-strategy'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { buildStrategyMarketplaceApplication, buildStoredStrategy, buildAdoptedStrategy }
  from '../../fixtures/strategy-application'

/** 市集上的一支，如同後端交出來的樣子。**它沒有算式**。 */
function publishedStrategyOf(
  id: number,
  name: string,
  overrides: { description?: string, resultType?: string, publisherEmail?: string } = {},
): PublishedStrategy {
  return new PublishedStrategy(
    id,
    name,
    overrides.description ?? '',
    overrides.resultType ?? 'floatList',
    overrides.publisherEmail ?? 'someone@example.com',
    new Date('2026-09-10T08:00:00.000Z'),
    [new StrategyParameterDto('期數', 'lookbackCount', 20)],
  )
}

// 只 mock 最外層的兩個 proxy；application、domain service 與所有 domain model 都是真的。
async function mountPanel(
  marketplaceProxy: Partial<IStrategyMarketplaceProxy> = {},
  strategyProxy: Partial<IStrategyProxy> = {},
) {
  const wrapper = mount(StrategyMarketplacePanel, {
    props: {
      strategyMarketplaceApplication: buildStrategyMarketplaceApplication(
        {
          browseMarketplace: vi.fn().mockResolvedValue([publishedStrategyOf(9, '別人的')]),
          ...marketplaceProxy,
        },
        strategyProxy,
      ),
    },
  })
  await flushPromises()

  return wrapper
}

describe('StrategyMarketplacePanel', () => {
  it('列出市集上的每一支，帶著判斷得出要不要收下的東西', async () => {
    const wrapper = await mountPanel({
      browseMarketplace: vi.fn().mockResolvedValue([
        publishedStrategyOf(9, '別人的', {
          description: '抓短線轉折', publisherEmail: 'someone@example.com',
        }),
      ]),
    })

    const card = wrapper.get('[data-testid="marketplace-strategy-9"]')
    expect(card.text()).toContain('別人的')
    expect(card.text()).toContain('抓短線轉折')
    expect(card.text()).toContain('someone@example.com')
    expect(card.text()).toContain('期數')
  })

  it('卡上沒有算式——那不是這裡藏起來的，是它根本沒有那一欄', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.text()).not.toContain('func Calculate')
    expect(wrapper.text()).not.toContain('sum := ')
  })

  it('沒寫說明時說一句話，而不是留一塊空白', async () => {
    // 算式看不到的時候，一塊空白會讓人以為這張卡壞了。
    const wrapper = await mountPanel({
      browseMarketplace: vi.fn().mockResolvedValue([publishedStrategyOf(9, '別人的')]),
    })

    expect(wrapper.get('[data-testid="marketplace-strategy-9"]').text())
      .toContain('分享的人沒有寫說明')
  })

  it('還沒收下的那一支給的是「加入」', async () => {
    const wrapper = await mountPanel()

    expect(wrapper.find('[data-testid="marketplace-adopt-9"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="marketplace-abandon-9"]').exists()).toBe(false)
  })

  it('收下過的那一支給的是「移除」', async () => {
    const wrapper = await mountPanel({}, {
      listAvailableStrategies: vi.fn().mockResolvedValue({
        mine: [],
        adopted: [buildAdoptedStrategy(9, '別人的')],
      }),
    })

    expect(wrapper.find('[data-testid="marketplace-abandon-9"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="marketplace-adopt-9"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="marketplace-strategy-adopted-9"]').text()).toContain('已加入')
  })

  it('自己分享的那一支標明是自己的，而且一顆按鈕都不給', async () => {
    // 自己的策略本來就在自己清單裡，給一顆按不出任何變化的按鈕比不給更糟。
    const wrapper = await mountPanel({}, {
      listAvailableStrategies: vi.fn().mockResolvedValue({
        mine: [buildStoredStrategy(9, '我分享的')],
        adopted: [],
      }),
    })

    expect(wrapper.get('[data-testid="marketplace-strategy-mine-9"]').text()).toContain('我分享的')
    expect(wrapper.find('[data-testid="marketplace-adopt-9"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="marketplace-abandon-9"]').exists()).toBe(false)
  })

  it('加入一支之後說出來，並重新讀一次', async () => {
    const adoptStrategy = vi.fn().mockResolvedValue(undefined)
    const browseMarketplace = vi.fn().mockResolvedValue([publishedStrategyOf(9, '別人的')])
    const wrapper = await mountPanel({ adoptStrategy, browseMarketplace })

    await wrapper.get('[data-testid="marketplace-adopt-9"]').trigger('click')
    await flushPromises()

    expect(adoptStrategy).toHaveBeenCalledWith(9)
    expect(wrapper.get('[data-testid="marketplace-notice"]').text()).toContain('加入')
    expect(browseMarketplace.mock.calls.length).toBeGreaterThan(1)
  })

  it('移除只影響自己——那一支還在市集上', async () => {
    const abandonStrategy = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ abandonStrategy }, {
      listAvailableStrategies: vi.fn().mockResolvedValue({
        mine: [],
        adopted: [buildAdoptedStrategy(9, '別人的')],
      }),
    })

    await wrapper.get('[data-testid="marketplace-abandon-9"]').trigger('click')
    await flushPromises()

    expect(abandonStrategy).toHaveBeenCalledWith(9)
    expect(wrapper.find('[data-testid="marketplace-strategy-9"]').exists()).toBe(true)
  })

  it('那一支剛被收回時，說得出下一步是重新看一次', async () => {
    const wrapper = await mountPanel({
      adoptStrategy: vi.fn().mockRejectedValue(new StrategyNotFoundError('找不到')),
    })

    await wrapper.get('[data-testid="marketplace-adopt-9"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="marketplace-failure-alert"]').text())
      .toContain('已經不在市集上')
  })

  it('空的市集不是錯誤', async () => {
    const wrapper = await mountPanel({ browseMarketplace: vi.fn().mockResolvedValue([]) })

    expect(wrapper.get('[data-testid="marketplace-empty"]').text()).toContain('還沒有任何策略')
    expect(wrapper.find('[data-testid="marketplace-unavailable-alert"]').exists()).toBe(false)
  })

  it('讀不到市集時說連不上，不顯示成空市集', async () => {
    // 那兩句話要使用者做的事完全不同：一句要他去把後端啟動起來，一句要他等別人分享。
    const wrapper = await mountPanel({
      browseMarketplace: vi.fn().mockRejectedValue(new Error('連不上')),
    })

    expect(wrapper.get('[data-testid="marketplace-unavailable-alert"]').text()).toContain('讀不到市集')
    expect(wrapper.find('[data-testid="marketplace-empty"]').exists()).toBe(false)
  })

  it('市集是空的時候連搜尋框都不給——搜不到任何東西的框只會讓人以為是自己搜錯了', async () => {
    const wrapper = await mountPanel({ browseMarketplace: vi.fn().mockResolvedValue([]) })

    expect(wrapper.find('[data-testid="marketplace-search-input"]').exists()).toBe(false)
  })

  it('畫不成線的那幾種先講，不等使用者套到圖上才失敗', async () => {
    const wrapper = await mountPanel({
      browseMarketplace: vi.fn().mockResolvedValue([
        publishedStrategyOf(9, '訊號策略', { resultType: 'signal' }),
      ]),
    })

    expect(wrapper.get('[data-testid="marketplace-strategy-undrawable-9"]').text())
      .toContain('畫不成線')
  })
})

describe('StrategyMarketplacePanel 的搜尋', () => {
  const twoStrategies = vi.fn().mockResolvedValue([
    publishedStrategyOf(1, '二十根均線', { description: '抓短線轉折' }),
    publishedStrategyOf(2, '布林通道', { publisherEmail: 'ming@example.com' }),
  ])

  async function search(query: string, browseMarketplace = twoStrategies) {
    const wrapper = await mountPanel({ browseMarketplace })
    await wrapper.get('[data-testid="marketplace-search-input"]').setValue(query)

    return wrapper
  }

  /** 眼前真的看得到的那幾支。 */
  function visibleNames(wrapper: Awaited<ReturnType<typeof search>>): string[] {
    return wrapper.findAll('li[data-testid^="marketplace-strategy-"]')
      .map(card => card.get('h3').text())
  }

  it('打一個詞就只剩對得上的', async () => {
    const wrapper = await search('均線')

    expect(visibleNames(wrapper)).toEqual(['二十根均線'])
  })

  it('沒有打字就是全部', async () => {
    const wrapper = await search('')

    expect(visibleNames(wrapper)).toEqual(['二十根均線', '布林通道'])
  })

  it('只打空白等同沒有打', async () => {
    const wrapper = await search('   ')

    expect(visibleNames(wrapper)).toEqual(['二十根均線', '布林通道'])
  })

  it('說明與分享者也搜得到', async () => {
    // 算式看不到的時候，說明是別人唯一的判斷依據；而人記得的常常是「誰分享的」。
    expect(visibleNames(await search('轉折'))).toEqual(['二十根均線'])
    expect(visibleNames(await search('ming'))).toEqual(['布林通道'])
  })

  it('搜不到時說的是「沒有符合」，不是「市集上還沒有任何策略」', async () => {
    // 兩句話要人做的事相反：一句要他換關鍵字，一句要他等別人分享。
    const wrapper = await search('不存在的東西')

    expect(wrapper.get('[data-testid="marketplace-no-matches"]').text()).toContain('沒有符合')
    expect(wrapper.find('[data-testid="marketplace-empty"]').exists()).toBe(false)
    expect(visibleNames(wrapper)).toEqual([])
  })

  it('搜不到時給一個清掉搜尋的去處，按下去全部回來', async () => {
    const wrapper = await search('不存在的東西')

    await wrapper.get('[data-testid="marketplace-clear-search"]').trigger('click')

    expect(visibleNames(wrapper)).toEqual(['二十根均線', '布林通道'])
    expect(wrapper.find('[data-testid="marketplace-no-matches"]').exists()).toBe(false)
  })

  it('搜出來的那一張照樣加得進來', async () => {
    const adoptStrategy = vi.fn().mockResolvedValue(undefined)
    const wrapper = await mountPanel({ adoptStrategy, browseMarketplace: twoStrategies })
    await wrapper.get('[data-testid="marketplace-search-input"]').setValue('均線')

    await wrapper.get('[data-testid="marketplace-adopt-1"]').trigger('click')
    await flushPromises()

    expect(adoptStrategy).toHaveBeenCalledWith(1)
  })

  it('加入之後搜尋條件還在——重讀清單不該把剛按過的那一張搖走', async () => {
    const wrapper = await mountPanel({
      adoptStrategy: vi.fn().mockResolvedValue(undefined),
      browseMarketplace: twoStrategies,
    })
    await wrapper.get('[data-testid="marketplace-search-input"]').setValue('均線')

    await wrapper.get('[data-testid="marketplace-adopt-1"]').trigger('click')
    await flushPromises()

    expect(visibleNames(wrapper)).toEqual(['二十根均線'])
  })

  it('搜尋不留存——重新打開就是全部', async () => {
    const searched = await search('均線')
    expect(visibleNames(searched)).toEqual(['二十根均線'])

    const reopened = await mountPanel({ browseMarketplace: twoStrategies })

    expect((reopened.get('[data-testid="marketplace-search-input"]').element as HTMLInputElement)
      .value).toBe('')
    expect(visibleNames(reopened)).toEqual(['二十根均線', '布林通道'])
  })

  it('連不上系統時說連不上，與搜尋無關', async () => {
    const wrapper = await mountPanel({
      browseMarketplace: vi.fn().mockRejectedValue(new Error('連不上')),
    })

    expect(wrapper.get('[data-testid="marketplace-unavailable-alert"]').text()).toContain('讀不到市集')
    expect(wrapper.find('[data-testid="marketplace-no-matches"]').exists()).toBe(false)
  })
})
