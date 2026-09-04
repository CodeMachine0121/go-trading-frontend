import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import { IndicatorScriptDomain } from '~/domain/models/domains/indicator-script-domain'
import type { StrategyWriteDto } from '~/domain/models/dto/strategy-write-dto'
import { StrategyFieldError } from '~/domain/errors/strategy-field-error'

/**
 * Domain Model：要存下去的一支策略，建構當下即驗證。
 *
 * 送出去的 `script` 是把使用者寫的內容**包回外框**之後的一整段算式——
 * 存下來的東西因此自己就是一支能跑的算式，不必再靠畫面拼裝才有意義。
 *
 * **名稱長度不在這裡檢查。** 那是後端的規則，前端抄一份下來，
 * 等到那邊改了、這邊沒跟著改，畫面就會擋掉其實存得下的名字。
 * 這裡只擋前端確定知道的事：名稱不能沒填。
 */
export class StrategyWriteDomain {
  readonly id: number | undefined
  readonly name: string
  readonly script: string
  readonly resultType: string
  readonly parameters: readonly StrategyParameterDto[]

  constructor(strategyWriteDto: StrategyWriteDto) {
    const normalizedName = strategyWriteDto.name.trim()
    if (normalizedName === '') {
      throw new StrategyFieldError('name', '請填寫策略名稱')
    }

    const resultType = new IndicatorResultTypeDomain(strategyWriteDto.content.resultType)

    this.id = strategyWriteDto.id
    this.name = normalizedName
    this.script = new IndicatorScriptDomain(resultType).assemble(strategyWriteDto.content.scriptBody)
    this.resultType = resultType.value
    // 旋鈕的規則由它們自己的模型把關，這裡只借用它——多一套判斷就多一個會漂移的地方。
    const parameters = new StrategyParametersDomain(strategyWriteDto.content.parameters)
    const parametersMessage = parameters.validationMessage()
    if (parametersMessage !== null) {
      throw new StrategyFieldError('parameters', parametersMessage)
    }
    this.parameters = parameters.all
  }
}
