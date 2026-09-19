import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptParametersDomain } from '~/domain/models/domains/strategy-script-parameters-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import type { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'

/**
 * Domain Model：要存下去的一支策略腳本，建構當下即驗證。
 *
 * 存下去的 `script` 就是畫面上那一份，**一字不改**：不接合、不修剪。
 * 載入一支策略腳本後原封不動再存一次，存回去的內容因此與載入時逐字相同——
 * 只要畫面還對內容動任何手腳，使用者就會開始懷疑自己是不是改到了什麼。
 *
 * **名稱長度不在這裡檢查。** 那是後端的規則，前端抄一份下來，
 * 等到那邊改了、這邊沒跟著改，畫面就會擋掉其實存得下的名字。
 * 這裡只擋前端確定知道的事：名稱不能沒填。
 */
export class StrategyScriptWriteDomain {
  readonly id: number | undefined
  readonly name: string
  readonly description: string
  readonly script: string
  readonly resultType: string
  readonly parameters: readonly StrategyScriptParameterDto[]

  constructor(strategyScriptWriteDto: StrategyScriptWriteDto) {
    const normalizedName = strategyScriptWriteDto.name.trim()
    if (normalizedName === '') {
      throw new StrategyScriptFieldError('name', '請填寫策略腳本名稱')
    }

    const resultType = new IndicatorResultTypeDomain(strategyScriptWriteDto.content.resultType)

    this.id = strategyScriptWriteDto.id
    this.name = normalizedName
    // 說明的長度上限與名稱同理，是後端的規則：抄一份下來，等那邊改了這邊沒跟著改，
    // 畫面就會擋掉其實存得下的東西。這裡只做一件前端確定知道的事：去掉前後空白，
    // 因為只打了空白與什麼都沒打，對讀的人是同一件事。
    this.description = strategyScriptWriteDto.description.trim()
    this.script = strategyScriptWriteDto.content.script
    this.resultType = resultType.value
    // 旋鈕的規則由它們自己的模型把關，這裡只借用它——多一套判斷就多一個會漂移的地方。
    const parameters = new StrategyScriptParametersDomain(strategyScriptWriteDto.content.parameters)
    const parametersMessage = parameters.validationMessage()
    if (parametersMessage !== null) {
      throw new StrategyScriptFieldError('parameters', parametersMessage)
    }
    this.parameters = parameters.all
  }
}
