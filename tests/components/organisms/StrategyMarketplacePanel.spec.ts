import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import StrategyMarketplacePanel from '~/components/organisms/StrategyMarketplacePanel.vue'
import { StrategyMarketplaceApplication } from '~/application/strategy-marketplace-application'
import { StrategyMarketplaceService } from '~/domain/service/strategy-marketplace-service'
import type { IStrategyMarketplaceProxy } from '~/domain/interface/i-strategy-marketplace-proxy'
import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { PublishedStrategy } from '~/domain/models/entities/published-strategy'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { buildStrategyApplication, buildStoredStrategy, buildAdoptedStrategy }
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
      strategyMarketplaceApplication: new StrategyMarketplaceApplication(
        new StrategyMarketplaceService({
          browseMarketplace: vi.fn().mockResolvedValue([publishedStrategyOf(9, '別人的')]),
          adoptStrategy: vi.fn().mockResolvedValue(undefined),
          abandonStrategy: vi.fn().mockResolvedValue(undefined),
          ...marketplaceProxy,
        }),
      ),
      strategyApplication: buildStrategyApplication(strategyProxy),
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
