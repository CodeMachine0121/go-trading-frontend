import type { IStrategyProxy } from '~/domain/interface/i-strategy-proxy'
import type { StrategyWriteDomain } from '~/domain/models/domains/strategy-write-domain'
import { StrategyParameterDto, STRATEGY_PARAMETER_KINDS } from '~/domain/models/dto/strategy-parameter-dto'
import { Strategy } from '~/domain/models/entities/strategy'
import { BackendRequestRejectedError } from '~/domain/errors/backend-request-rejected-error'
import { StrategyNameConflictError } from '~/domain/errors/strategy-name-conflict-error'
import { StrategyNotFoundError } from '~/domain/errors/strategy-not-found-error'
import { BackendApiProxy } from '~/infrastructure/proxy/backend-api-proxy'

const STRATEGIES_ENDPOINT = '/strategies'

/** 後端用這兩個狀態碼分別表示「名稱被佔用」與「沒有這一支」。只有這裡需要知道。 */
const NAME_CONFLICT_STATUS = 409
const NOT_FOUND_STATUS = 404

/**
 * 後端回傳的原始 wire 形狀，只存在於本檔內。
 * 兩個時間欄位後端也會給，但畫面上沒有一處用得到，因此不收進 entity——
 * 收了就得替它們想一個顯示時區的說法，而那是還沒有人要的功能。
 */
/** 後端送來的一個旋鈕。名稱與這一側的欄位刻意不同，所以在這裡收乾淨。 */
type StrategyParameterWire = {
  name: string
  kind: string
  defaultValue: number
}

type StrategyWire = {
  id: number
  name: string
  script: string
  resultType: string
  parameters?: StrategyParameterWire[] | null
}

/** Proxy：打策略端點，並把「名稱被佔用」與「找不到那一支」從一般的拒絕裡分出來。 */
export class StrategyProxy extends BackendApiProxy implements IStrategyProxy {
  async listStrategies(): Promise<Strategy[]> {
    const strategyWires = await this.requestBackend<StrategyWire[]>(STRATEGIES_ENDPOINT)

    return strategyWires.map(strategyWire => this.toStrategy(strategyWire))
  }

  async createStrategy(strategyWriteDomain: StrategyWriteDomain): Promise<Strategy> {
    return this.writeStrategy(
      STRATEGIES_ENDPOINT, 'POST', strategyWriteDomain)
  }

  async updateStrategy(strategyWriteDomain: StrategyWriteDomain): Promise<Strategy> {
    return this.writeStrategy(
      `${STRATEGIES_ENDPOINT}/${strategyWriteDomain.id}`, 'PUT', strategyWriteDomain)
  }

  async deleteStrategy(id: number): Promise<void> {
    try {
      await this.requestBackend<null>(`${STRATEGIES_ENDPOINT}/${id}`, { method: 'DELETE' })
    }
    catch (error: unknown) {
      throw this.strategyFailureOf(error)
    }
  }

  /**
   * 建立與改寫只差在打哪一條路徑，其餘完全相同：同一份 body、同一套失敗翻譯。
   * 分成兩份寫的話，翻譯規則就有兩個地方會漂移。
   */
  private async writeStrategy(
    path: string,
    method: 'POST' | 'PUT',
    strategyWriteDomain: StrategyWriteDomain,
  ): Promise<Strategy> {
    try {
      const strategyWire = await this.requestBackend<StrategyWire>(path, {
        method,
        body: {
          name: strategyWriteDomain.name,
          script: strategyWriteDomain.script,
          resultType: strategyWriteDomain.resultType,
          parameters: strategyWriteDomain.parameters.map(parameter => ({
            name: parameter.name,
            kind: parameter.kind,
            // 在這個畫面上，畫面上那個數字既是這一次要用的，也是要存起來的預設值。
            defaultValue: parameter.value,
          })),
        },
      })

      return this.toStrategy(strategyWire)
    }
    catch (error: unknown) {
      throw this.strategyFailureOf(error)
    }
  }

  /**
   * 狀態碼只在這一層被解讀。名稱被佔用與找不到那一支，使用者的下一步完全不同——
   * 前者當場改個名字，後者改什麼都沒用——所以它們不能共用一種錯誤。
   * 其餘的拒絕原樣往上拋，由既有的呈現方式處理。
   */
  private strategyFailureOf(error: unknown): unknown {
    if (!(error instanceof BackendRequestRejectedError)) {
      return error
    }

    if (error.status === NAME_CONFLICT_STATUS) {
      return new StrategyNameConflictError(error.message, { cause: error })
    }
    if (error.status === NOT_FOUND_STATUS) {
      return new StrategyNotFoundError(error.message, { cause: error })
    }

    return error
  }

  private toStrategy(strategyWire: StrategyWire): Strategy {
    return new Strategy(
      strategyWire.id,
      strategyWire.name,
      strategyWire.script,
      strategyWire.resultType,
      // 認得的照收，認不得的一律當成數值——系統對數值不解讀任何意思，
      // 所以把它當成數值最不會誤導人：它不會憑空變成一個回看根數去多拿 K 線。
      //
      // 「認得的」問的是那一份清單，不是一串寫死的比較。這裡曾經是後者，
      // 於是多一種種類的時候它被漏掉，而存好的東西讀回來就換了一種種類。
      (strategyWire.parameters ?? []).map(parameter => new StrategyParameterDto(
        parameter.name,
        STRATEGY_PARAMETER_KINDS.find(kind => kind === parameter.kind) ?? 'number',
        parameter.defaultValue)),
    )
  }
}
