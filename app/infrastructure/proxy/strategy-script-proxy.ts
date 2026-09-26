import type { IStrategyScriptProxy } from '~/domain/interface/i-strategy-script-proxy'
import type { StrategyScriptWriteDomain } from '~/domain/models/domains/strategy-script-write-domain'
import { StrategyScriptParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-script-parameter-dto'
import { PublishedStrategyScript } from '~/domain/models/entities/published-strategy-script'
import { StrategyScript } from '~/domain/models/entities/strategy-script'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyScriptNameConflictError } from '~/domain/errors/strategy-script-name-conflict-error'
import { StrategyScriptNotFoundError } from '~/domain/errors/strategy-script-not-found-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const STRATEGIES_ENDPOINT = '/strategy-scripts'

/** 後端用這兩個狀態碼分別表示「名稱被佔用」與「沒有這一支」。只有這裡需要知道。 */
const NAME_CONFLICT_STATUS = 409
const NOT_FOUND_STATUS = 404

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內。
 * 兩個時間欄位後端也會給，但畫面上沒有一處用得到，因此不收進 entity——
 * 收了就得替它們想一個顯示時區的說法，而那是還沒有人要的功能。
 */
/** 後端送來的一個旋鈕。名稱與這一側的欄位刻意不同，所以在這裡收乾淨。 */
type StrategyScriptParameterWire = {
  name: string
  kind: string
  defaultValue: number
}

type StrategyScriptWire = {
  id: number
  name: string
  /** 舊版後端不給這一項，所以它是選擇性的——讀不到就當成沒寫說明。 */
  description?: string
  script: string
  resultType: string
  parameters?: StrategyScriptParameterWire[] | null
  published?: boolean
  /** 舊版後端不給這一項；讀不到就是 K 線——那時候只有這一種。 */
  marketDataKind?: string
}

/** 市集那一段送來的一張卡。**它沒有 script**——那不是漏了，是那一欄不存在。 */
type PublishedStrategyScriptWire = {
  id: number
  name: string
  description?: string
  resultType: string
  publisherEmail: string
  publishedAt: string
  parameters?: StrategyScriptParameterWire[] | null
  marketDataKind?: string
}

/** 從市集加入的副本：與自己的策略腳本同形，但算式永遠是空的，而且帶著它被加入的時刻。 */
type AdoptedStrategyScriptWire = StrategyScriptWire & {
  createdAt: string
}

/** 日常那一份送來的兩段。 */
type AvailableStrategyScriptsWire = {
  mine?: StrategyScriptWire[] | null
  adopted?: AdoptedStrategyScriptWire[] | null
}

/** Proxy：打策略腳本端點，並把「名稱被佔用」與「找不到那一支」從一般的拒絕裡分出來。 */
export class StrategyScriptProxy extends BackendApiProxy implements IStrategyScriptProxy {
  async listAvailableStrategyScripts(): Promise<{ mine: StrategyScript[], adopted: PublishedStrategyScript[] }> {
    const availableWire = await this.requestBackend<AvailableStrategyScriptsWire>(STRATEGIES_ENDPOINT)

    return {
      mine: (availableWire.mine ?? []).map(strategyScriptWire => this.toStrategyScript(strategyScriptWire)),
      // 副本不記得是誰分享的，所以分享者留空；它屬於清單的那一刻就是它被加入的那一刻。
      adopted: (availableWire.adopted ?? []).map(adoptedWire => this.toPublishedStrategyScript({
        id: adoptedWire.id,
        name: adoptedWire.name,
        description: adoptedWire.description,
        resultType: adoptedWire.resultType,
        publisherEmail: '',
        publishedAt: adoptedWire.createdAt,
        parameters: adoptedWire.parameters,
        marketDataKind: adoptedWire.marketDataKind,
      })),
    }
  }

  async createStrategyScript(strategyScriptWriteDomain: StrategyScriptWriteDomain): Promise<StrategyScript> {
    return this.writeStrategyScript(
      STRATEGIES_ENDPOINT, 'POST', strategyScriptWriteDomain)
  }

  async updateStrategyScript(strategyScriptWriteDomain: StrategyScriptWriteDomain): Promise<StrategyScript> {
    return this.writeStrategyScript(
      `${STRATEGIES_ENDPOINT}/${strategyScriptWriteDomain.id}`, 'PUT', strategyScriptWriteDomain)
  }

  async publishStrategyScript(id: number): Promise<void> {
    await this.changePublication(id, 'POST')
  }

  async withdrawStrategyScript(id: number): Promise<void> {
    await this.changePublication(id, 'DELETE')
  }

  async deleteStrategyScript(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${STRATEGIES_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.strategyScriptFailureOf(error)
    }
  }

  /**
   * 放上市集與從市集收回打的是同一條路徑，只差在方法——它們說的是同一件事的兩個方向
   * （「這一支在市集上」成立或不成立），所以它們的失敗翻譯也一定相同。
   */
  private async changePublication(id: number, method: 'POST' | 'DELETE'): Promise<void> {
    try {
      await this.requestBackend<null>(
        `${STRATEGIES_ENDPOINT}/${id}/publication`, { method })
    }
    catch (error: unknown) {
      throw this.strategyScriptFailureOf(error)
    }
  }

  /**
   * 建立與改寫只差在打哪一條路徑，其餘完全相同：同一份 body、同一套失敗翻譯。
   * 分成兩份寫的話，翻譯規則就有兩個地方會漂移。
   */
  private async writeStrategyScript(
    path: string,
    method: 'POST' | 'PUT',
    strategyScriptWriteDomain: StrategyScriptWriteDomain,
  ): Promise<StrategyScript> {
    try {
      const strategyScriptWire = await this.requestBackend<StrategyScriptWire>(path, {
        method,
        body: {
          name: strategyScriptWriteDomain.name,
          description: strategyScriptWriteDomain.description,
          script: strategyScriptWriteDomain.script,
          resultType: strategyScriptWriteDomain.resultType,
          marketDataKind: strategyScriptWriteDomain.marketDataKind,
          parameters: strategyScriptWriteDomain.parameters.map(parameter => ({
            name: parameter.name,
            kind: parameter.kind,
            // 在這個畫面上，畫面上那個數字既是這一次要用的，也是要存起來的預設值。
            defaultValue: parameter.value,
          })),
        },
      })

      return this.toStrategyScript(strategyScriptWire)
    }
    catch (error: unknown) {
      throw this.strategyScriptFailureOf(error)
    }
  }

  /**
   * 狀態碼只在這一層被解讀。名稱被佔用與找不到那一支，使用者的下一步完全不同——
   * 前者當場改個名字，後者改什麼都沒用——所以它們不能共用一種錯誤。
   * 其餘的拒絕原樣往上拋，由既有的呈現方式處理。
   */
  private strategyScriptFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NAME_CONFLICT_STATUS) {
      return new StrategyScriptNameConflictError(error.message, { cause: error })
    }
    if (error.status === NOT_FOUND_STATUS) {
      return new StrategyScriptNotFoundError(error.message, { cause: error })
    }

    return error
  }

  /**
   * 市集那一段收乾淨。它與自己的那一段共用旋鈕的收法，卻**沒有算式可以收**——
   * 那正是它與自己的策略腳本唯一的差別，也是唯一重要的差別。
   */
  private toPublishedStrategyScript(publishedWire: PublishedStrategyScriptWire): PublishedStrategyScript {
    return new PublishedStrategyScript(
      publishedWire.id,
      publishedWire.name,
      publishedWire.description ?? '',
      publishedWire.resultType,
      publishedWire.publisherEmail,
      new Date(publishedWire.publishedAt),
      this.toParameterDtos(publishedWire.parameters),
      publishedWire.marketDataKind ?? 'kCandle',
    )
  }

  private toStrategyScript(strategyScriptWire: StrategyScriptWire): StrategyScript {
    return new StrategyScript(
      strategyScriptWire.id,
      strategyScriptWire.name,
      strategyScriptWire.description ?? '',
      strategyScriptWire.script,
      strategyScriptWire.resultType,
      // 認得的照收，認不得的一律當成數值——系統對數值不解讀任何意思，
      // 所以把它當成數值最不會誤導人：它不會憑空變成一個回看根數去多拿 K 線。
      //
      // 「認得的」問的是那一份清單，不是一串寫死的比較。這裡曾經是後者，
      // 於是多一種種類的時候它被漏掉，而存好的東西讀回來就換了一種種類。
      this.toParameterDtos(strategyScriptWire.parameters),
      strategyScriptWire.published ?? false,
      strategyScriptWire.marketDataKind ?? 'kCandle',
    )
  }

  /**
   * 旋鈕收乾淨。自己的那一段與市集那一段共用它——旋鈕的收法沒有理由分成兩份，
   * 而分成兩份就會有一份先學會新的種類。
   */
  private toParameterDtos(
    parameterWires: StrategyScriptParameterWire[] | null | undefined,
  ): StrategyScriptParameterDto[] {
    return (parameterWires ?? []).map(parameter => new StrategyScriptParameterDto(
      parameter.name,
      STRATEGY_PARAMETER_KINDS.find(kind => kind === parameter.kind) ?? 'number',
      parameter.defaultValue))
  }
}
