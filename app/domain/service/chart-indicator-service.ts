import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IStrategyParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-parameter-value-preference-proxy'
import { AppliedIndicatorParametersDomain } from '~/domain/models/domains/applied-indicator-parameters-domain'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { StrategyDto } from '~/domain/models/dto/strategy-dto'
import type { StrategyParameterDto } from '~/domain/models/dto/strategy-parameter-dto'
import { ChartIndicatorDomain } from '~/domain/models/domains/chart-indicator-domain'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { StrategyParametersDomain } from '~/domain/models/domains/strategy-parameters-domain'
import { StrategyParameterDomain } from '~/domain/models/domains/strategy-parameter-domain'
import { StrategyParameterFieldDto } from '~/domain/models/dto/strategy-parameter-field-dto'
import { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import { CHART_LINE_COLORS } from '~/domain/models/vo/chart-line-color-vo'

/**
 * Domain Service：圖表指標的編排。
 * 公開用例方法之間互不呼叫。
 */
export class ChartIndicatorService {
  constructor(
    private readonly indicatorCalculationProxy: IIndicatorCalculationProxy,
    private readonly chartLineColorPreferenceProxy: IChartLineColorPreferenceProxy,
    private readonly strategyParameterValuePreferenceProxy:
    IStrategyParameterValuePreferenceProxy,
  ) {}

  /**
   * 準備一次套用：交出這一支這一次要用的那幾格。
   *
   * 呼叫端只說「我要套用這一支」。讀記憶、對照宣告、丟掉已經不存在的名字、
   * 補上策略的預設值，四件事都在這裡面——**呼叫端不知道記憶存在，也不該知道**。
   */
  prepareAppliedIndicator(strategy: StrategyDto, appliedIndicatorId: number): AppliedIndicatorDto {
    return new AppliedIndicatorDto(
      appliedIndicatorId,
      strategy,
      new AppliedIndicatorParametersDomain(
        strategy.id,
        strategy.content.parameters,
        this.strategyParameterValuePreferenceProxy).toDtos(),
    )
  }

  /**
   * 把這一次調成的值記下來。
   *
   * 記的是「**這支策略的這個旋鈕**上次被調成什麼」，不是「這一次套用」——
   * 清單本來就不留存，所以下次打開時「這一次」已經不存在了；
   * 能被記住而且有意義的，是「我習慣把這支的期數調成 60」。
   */
  rememberAppliedIndicatorParameters(appliedIndicatorDto: AppliedIndicatorDto): void {
    new AppliedIndicatorParametersDomain(
      appliedIndicatorDto.strategy.id,
      appliedIndicatorDto.parameters,
      this.strategyParameterValuePreferenceProxy).remember(appliedIndicatorDto.parameters)
  }

  /**
   * 這幾格在畫面上該長什麼樣子。
   *
   * 「回看根數要整數鍵盤」是業務規則，不是版面問題——與宣告在哪裡編輯無關，
   * 所以與指標計算畫面那一側借用同一份模型，而不是各判斷一次。
   */
  describeAppliedIndicatorParameters(
    parameters: readonly StrategyParameterDto[],
  ): StrategyParameterFieldDto[] {
    return parameters.map((parameter) => {
      const parameterDomain = new StrategyParameterDomain(parameter)

      return new StrategyParameterFieldDto(
        parameter,
        parameterDomain.control(),
        parameterDomain.isTrue(),
        parameterDomain.inputMode(),
        parameterDomain.step(),
        parameterDomain.validationMessage() !== null)
    })
  }

  /** 這幾格哪裡不對——沒有就是 null。規則與宣告在哪裡編輯無關，所以借用同一份。 */
  validateAppliedIndicatorParameters(
    parameters: readonly StrategyParameterDto[],
  ): string | null {
    return new StrategyParametersDomain(parameters).validationMessage()
  }

  /**
   * 拿一支策略對圖上那批 K 線算一次，交出它該畫的那幾條線。
   *
   * 送出去的是**圖上正在畫的那一批**的每一個條件，因此算回來的值與圖上的 K 線是同一段行情。
   * 顏色在這裡就配好——畫面收到的每一條線都已經知道自己是什麼顏色，
   * 不必也不該自己去查誰挑過什麼。
   */
  async calculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    const { appliedIndicator } = chartIndicatorRequestDto
    const requestDomain = new IndicatorCalculationRequestDomain(
      new IndicatorCalculationRequestDto(
        chartIndicatorRequestDto.symbol,
        chartIndicatorRequestDto.aggregationInterval,
        chartIndicatorRequestDto.candleCount,
        appliedIndicator.strategy.content.scriptBody,
        appliedIndicator.strategy.content.resultType,
        // **這一次**的值，不是策略記著的預設值。同一支策略的另一筆套用
        // 可能填著完全不同的數字，而它們必須各自算各自的。
        appliedIndicator.parameters,
        chartIndicatorRequestDto.endTime,
      ))

    const indicatorCalculation
      = await this.indicatorCalculationProxy.calculateIndicator(requestDomain)

    const chartIndicatorDomain = new ChartIndicatorDomain(
      // 線的記憶身分掛在**策略**上，不在這一次套用上：顏色記的是跨越每一次打開畫面的習慣。
      appliedIndicator.strategy.id,
      indicatorCalculation,
      this.chartLineColorPreferenceProxy,
      chartIndicatorRequestDto.drawnLines,
    )

    return new ChartIndicatorDto(
      // 畫出來的東西屬於**這一次套用**：移除哪一筆、覆蓋哪一筆都認它。
      appliedIndicator.id,
      appliedIndicator.strategy.name,
      chartIndicatorDomain.toLevelDtos(),
      chartIndicatorDomain.toSeriesDtos(),
    )
  }

  /**
   * 替一條線換顏色：記住它，並交出換過之後的那幾支指標。
   *
   * 記住與就地換色是同一件事的兩半，因此在同一個用例裡完成。
   * 只記住而讓畫面等下一次重算，會讓一個純呈現的動作跑一趟系統；
   * 只就地換而不記住，則下次打開又回到原色。記不住不影響這一次——那由 proxy 自己吞掉。
   */
  changeChartLineColor(
    chartIndicatorDtos: readonly ChartIndicatorDto[], lineKey: string, colorToken: string,
  ): ChartIndicatorDto[] {
    this.chartLineColorPreferenceProxy.writeColorToken(lineKey, colorToken)

    return chartIndicatorDtos.map(
      chartIndicatorDto => chartIndicatorDto.withLineColor(lineKey, colorToken))
  }

  /** 使用者可以挑的線色，含給人看的名字。清單沿用既有的那一份，不另列。 */
  listChartLineColorOptions(): ChartLineColorOptionDto[] {
    return CHART_LINE_COLORS.map(color => new ChartLineColorOptionDto(color.token, color.label))
  }
}
