import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'
import { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'

/**
 * Domain Model：這一次套用要用的那幾格——策略的宣告，配上這台瀏覽器記得的值。
 *
 * **宣告是唯一的真相。** 逐條走的是宣告，不是記憶：
 * 記憶裡有、宣告裡沒有的名字一律丟掉。留著它只會讓一個畫面上找不到、
 * 使用者也改不動的旋鈕繼續影響計算。
 *
 * 「改名」不需要第四條規則——它就是「少了一個舊的、多了一個新的」，
 * 上面兩條自然涵蓋：舊名字丟掉，新名字沒有記憶所以用策略的預設值。
 *
 * 收的是**能力**而不是一份查好的表，理由與線色那邊一字不差：
 * 鍵怎麼組只有領域知道。
 */
export class AppliedIndicatorParametersDomain {
  constructor(
    private readonly strategyId: number,
    private readonly declaredParameters: readonly StrategyParameterDto[],
    private readonly strategyParameterValuePreferenceProxy:
    IStrategyParameterValuePreferenceProxy,
  ) {}

  /** 這一次要顯示、也要拿去算的那幾格。名稱與種類照宣告，值照記憶或預設。 */
  toDtos(): StrategyParameterDto[] {
    return this.declaredParameters.map((parameter) => {
      const rememberedValue = this.strategyParameterValuePreferenceProxy.readValue(
        this.strategyId, parameter.name)

      return new StrategyParameterDto(
        parameter.name,
        parameter.kind,
        // 策略帶進來的那一份，它的值就是這支策略記著的預設值。
        rememberedValue ?? parameter.value,
      )
    })
  }

  /** 把這一次調成的值記下來，下次挑同一支時那幾格就是它們。 */
  remember(parameters: readonly StrategyParameterDto[]): void {
    for (const parameter of parameters) {
      this.strategyParameterValuePreferenceProxy.writeValue(
        this.strategyId, parameter.name, parameter.value)
    }
  }
}
