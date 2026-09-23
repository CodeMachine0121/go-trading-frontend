import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { StrategyScriptParametersDomain } from '~/domain/models/domains/strategy-script-parameters-domain'
import { IndicatorResultTypeDomain } from '~/domain/models/domains/indicator-result-type-domain'
import type { StrategyScriptWriteDto } from '~/domain/models/dto/strategy-script-write-dto'
import { StrategyScriptFieldError } from '~/domain/errors/strategy-script-field-error'
import { MarketDataKindDomain } from '~/domain/models/domains/market-data-kind-domain'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

/**
 * Domain Model：要存下去的一支策略腳本，建構當下即驗證。
 *
 * 存下去的 `script` 就是畫面上那一份，**一字不改**：不接合、不修剪。
 * 唯一的門是「整份空白」——那時沒有算法可以存，與送出計算是同一條規則。
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
  readonly marketDataKind: MarketDataKind

  constructor(strategyScriptWriteDto: StrategyScriptWriteDto) {
    const normalizedName = strategyScriptWriteDto.name.trim()
    if (normalizedName === '') {
      throw new StrategyScriptFieldError('name', '請填寫策略腳本名稱')
    }

    // 整份空白就擋下，與送出計算、送出回測同一條規則、同一句話。
    // 這條以前不必寫：那時畫面會替使用者把外框接上去，一份「空的」算式送出去
    // 仍然是七行 package 與 import。現在存下去的就是編輯區裡那一份，
    // 少了這道門，一份空白會一路送到後端，換回一句畫面接不住的拒絕。
    if (strategyScriptWriteDto.content.script.trim() === '') {
      throw new StrategyScriptFieldError('script', '請填寫算式內容')
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
    // 這支算式吃哪一種行情跟著內容走，由它自己的模型正規化。改寫時照舊送出同一種：
    // 系統只拒絕「換成另一種」，照抄原本那一種不算更換。
    this.marketDataKind = new MarketDataKindDomain(strategyScriptWriteDto.content.marketDataKind).value
  }
}
