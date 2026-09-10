import type { IStrategyMarketplaceProxy } from '~/domain/interface/i-strategy-marketplace-proxy'
import { PublishedStrategy } from '~/domain/models/entities/published-strategy'
import { StrategyParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-parameter-dto'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const MARKETPLACE_ENDPOINT = '/marketplace/strategies'

/** 後端用這個狀態碼說「市集上沒有這一支」——那與「沒有這一支」是同一句話。 */
const NOT_FOUND_STATUS = 404

/** 市集上一張卡的原始形狀，只存在於本檔內。**它沒有 script**——那不是漏了，是那一欄不存在。 */
type PublishedStrategyWire = {
  id: number
  name: string
  description?: string
  resultType: string
  publisherEmail: string
  publishedAt: string
  parameters?: { name: string, kind: string, defaultValue: number }[] | null
}

/** Proxy：打市集端點，並把「市集上沒有這一支」從一般的拒絕裡分出來。 */
export class StrategyMarketplaceProxy extends BackendApiProxy implements IStrategyMarketplaceProxy {
  async browseMarketplace(): Promise<PublishedStrategy[]> {
    const publishedWires
      = await this.requestBackend<PublishedStrategyWire[]>(MARKETPLACE_ENDPOINT)

    return publishedWires.map(publishedWire => this.toPublishedStrategy(publishedWire))
  }

  async adoptStrategy(id: number): Promise<void> {
    await this.changeAdoption(id, 'POST')
  }

  async abandonStrategy(id: number): Promise<void> {
    await this.changeAdoption(id, 'DELETE')
  }

  /**
   * 加入與拿掉打的是同一條路徑，只差在方法——它們是同一件事的兩個方向
   * （「這一支在我的清單上」成立或不成立），所以失敗的翻譯也一定相同。
   */
  private async changeAdoption(id: number, method: 'POST' | 'DELETE'): Promise<void> {
    try {
      await this.requestBackend<null>(`${MARKETPLACE_ENDPOINT}/${id}/adoption`, { method })
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
      return new StrategyNotFoundError(error.message, { cause: error })
    }

    return error
  }

  private toPublishedStrategy(publishedWire: PublishedStrategyWire): PublishedStrategy {
    return new PublishedStrategy(
      publishedWire.id,
      publishedWire.name,
      publishedWire.description ?? '',
      publishedWire.resultType,
      publishedWire.publisherEmail,
      new Date(publishedWire.publishedAt),
      // 認得的照收，認不得的一律當成數值——與策略那一邊同一條規則、同一個理由：
      // 系統對數值不解讀任何意思，所以它不會憑空變成一個回看根數去多拿 K 線。
      (publishedWire.parameters ?? []).map(parameter => new StrategyParameterDto(
        parameter.name,
        STRATEGY_PARAMETER_KINDS.find(kind => kind === parameter.kind) ?? 'number',
        parameter.defaultValue)),
    )
  }
}
