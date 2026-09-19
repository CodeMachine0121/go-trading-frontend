import { vi } from 'vitest'
import { StrategyScriptApplication } from '~/application/strategy-script-application'
import { StrategyScriptService } from '~/domain/service/strategy-script-service'
import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { IStrategyScriptMarketplaceProxy } from '~/domain/interface/i-strategy-script-marketplace-proxy'
import { StrategyScriptMarketplaceApplication } from '~/application/strategy-script-marketplace-application'
import { StrategyScriptMarketplaceService } from '~/domain/service/strategy-script-marketplace-service'
import { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'

/**
 * 策略腳本來自後端，只 mock 它的介面；application、domain service 與所有 domain model 都是真的。
 * 預設一支都沒有——既有的測試因此不會因為多了一份清單而改變行為。
 */
export function buildStrategyScriptApplication(
  strategyScriptProxy: Partial<IStrategyScriptProxy> = {},
): StrategyScriptApplication {
  return new StrategyScriptApplication(new StrategyScriptService({
    listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [], adopted: [] }),
    createStrategyScript: vi.fn(),
    updateStrategyScript: vi.fn(),
    deleteStrategyScript: vi.fn().mockResolvedValue(undefined),
    publishStrategyScript: vi.fn().mockResolvedValue(undefined),
    withdrawStrategyScript: vi.fn().mockResolvedValue(undefined),
    ...strategyScriptProxy,
  }))
}

/**
 * 一支存在後端那頭的策略腳本。算式是**一整份**——後端存的與畫面上看到的是同一份，
 * 這裡因此直接給整份，不再有「主體」與「外框」兩個形狀要拼。
 */
export function buildStoredStrategyScript(
  id: number,
  name: string,
  overrides: {
    script?: string
    resultType?: string
    parameters?: readonly StrategyScriptParameterDto[]
  } = {},
): StrategyScript {
  return new StrategyScript(
    id,
    name,
    '',
    overrides.script ?? 'package main\n\nimport "indicator"\n\n'
    + 'func Calculate(data []indicator.KCandle) map[string][]float64 {\n\tsum := 0.0\n\treturn nil\n}',
    overrides.resultType ?? 'floatList',
    overrides.parameters ?? [],
  )
}

/** 一支從市集加入來的策略腳本，如同後端交出來的樣子——**它沒有算式**。 */
export function buildAdoptedStrategyScript(
  id: number,
  name: string,
  overrides: {
    description?: string
    resultType?: string
    parameters?: readonly StrategyScriptParameterDto[]
    publisherEmail?: string
  } = {},
): PublishedStrategyScript {
  return new PublishedStrategyScript(
    id,
    name,
    overrides.description ?? '',
    overrides.resultType ?? 'floatList',
    overrides.publisherEmail ?? 'someone@example.com',
    new Date('2026-09-10T08:00:00.000Z'),
    overrides.parameters ?? [],
  )
}

/**
 * 市集那一條線，只 mock 它最外層的 proxy。預設市集是空的、加入與移除都成功——
 * 大部分的測試不在乎市集，它們在乎的是它有沒有把畫面接壞。
 */
export function buildStrategyScriptMarketplaceApplication(
  strategyScriptMarketplaceProxy: Partial<IStrategyScriptMarketplaceProxy> = {},
  strategyScriptProxy: Partial<IStrategyScriptProxy> = {},
): StrategyScriptMarketplaceApplication {
  return new StrategyScriptMarketplaceApplication(
    new StrategyScriptMarketplaceService({
      browseMarketplace: vi.fn().mockResolvedValue([]),
      adoptStrategyScript: vi.fn().mockResolvedValue(undefined),
      abandonStrategyScript: vi.fn().mockResolvedValue(undefined),
      ...strategyScriptMarketplaceProxy,
    }),
    // 市集也要問「哪幾支是我的、哪幾支我收下過」，所以它同時吃自己清單那一條線。
    new StrategyScriptService({
      listAvailableStrategyScripts: vi.fn().mockResolvedValue({ mine: [], adopted: [] }),
      createStrategyScript: vi.fn(),
      updateStrategyScript: vi.fn(),
      deleteStrategyScript: vi.fn(),
      publishStrategyScript: vi.fn(),
      withdrawStrategyScript: vi.fn(),
      ...strategyScriptProxy,
    }),
  )
}
