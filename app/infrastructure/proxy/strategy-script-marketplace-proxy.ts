import type { IStrategyScriptMarketplaceProxy } from '~/domain/interface/i-strategy-script-marketplace-proxy'
import { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'
import { StrategyScriptParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-script-parameter-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const MARKETPLACE_ENDPOINT = '/marketplace/strategy-scripts'

/** 後端用這個狀態碼說「市集上沒有這一支」——那與「沒有這一支」是同一句話。 */
const NOT_FOUND_STATUS = 404

/** 市集上一張卡的原始形狀，只存在於本檔內。**它沒有 script**——那不是漏了，是那一欄不存在。 */
type PublishedStrategyScriptWire = {
  id: number
  name: string
  description?: string
  resultType: string
  publisherEmail: string
  publishedAt: string
  parameters?: { name: string, kind: string, defaultValue: number }[] | null
  /** 舊版後端不給這一項；讀不到就是 K 線。 */
  marketDataKind?: string
}

/** Proxy：打市集端點，並把「市集上沒有這一支」從一般的拒絕裡分出來。 */
export class StrategyScriptMarketplaceProxy extends BackendApiProxy implements IStrategyScriptMarketplaceProxy {
  async browseMarketplace(): Promise<PublishedStrategyScript[]> {
    const publishedWires
      = await this.requestBackend<PublishedStrategyScriptWire[]>(MARKETPLACE_ENDPOINT)

    return publishedWires.map(publishedWire => this.toPublishedStrategyScript(publishedWire))
  }

  /** 加入＝後端複製一份給這個人；名稱已被使用時的拒絕照原樣往上交。 */
  async adoptStrategyScript(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${MARKETPLACE_ENDPOINT}/${id}/adoption`, { method: 'POST' })
    }
    catch (error: unknown) {
      throw this.marketplaceFailureOf(error)
    }
  }

  /**
   * 狀態碼只在這一層被解讀。「市集上沒有這一支」與其他拒絕，使用者的下一步不同：
   * 前者重新看一次市集（它可能剛被收回），後者是這次請求本身的問題。
   */
  private marketplaceFailureOf(error: unknown): unknown {
    if (error instanceof BackendRequestRejectedError && error.status === NOT_FOUND_STATUS) {
      return new StrategyScriptNotFoundError(error.message, { cause: error })
    }

    return error
  }

  private toPublishedStrategyScript(publishedWire: PublishedStrategyScriptWire): PublishedStrategyScript {
    return new PublishedStrategyScript(
      publishedWire.id,
      publishedWire.name,
      publishedWire.description ?? '',
      publishedWire.resultType,
      publishedWire.publisherEmail,
      new Date(publishedWire.publishedAt),
      // 認得的照收，認不得的一律當成數值——與策略腳本那一邊同一條規則、同一個理由：
      // 系統對數值不解讀任何意思，所以它不會憑空變成一個回看根數去多拿 K 線。
      (publishedWire.parameters ?? []).map(parameter => new StrategyScriptParameterDto(
        parameter.name,
        STRATEGY_PARAMETER_KINDS.find(kind => kind === parameter.kind) ?? 'number',
        parameter.defaultValue)),
      publishedWire.marketDataKind ?? 'kCandle',
    )
  }
}
