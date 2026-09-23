import type { IAppliedChartIndicatorPreferenceProxy } from '~/domain/interface/i-applied-chart-indicator-preference-proxy'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import type { IndicatorCalculation } from '~/domain/models/entities/indicator-calculation'
import type { IStrategyScriptParameterValuePreferenceProxy } from '~/domain/interface/i-strategy-script-parameter-value-preference-proxy'
import { AppliedIndicatorParametersDomain } from '~/domain/models/domains/applied-indicator-parameters-domain'
import { AppliedIndicatorDto } from '~/domain/models/dto/applied-indicator-dto'
import type { ChartApplicableStrategyScriptDto } from '~/domain/models/dto/chart-applicable-strategy-script-dto'
import type { StrategyScriptParameterDto } from '~/domain/models/dto/strategy-script-parameter-dto'
import { ChartIndicatorDomain } from '~/domain/models/domains/chart-indicator-domain'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { RememberedAppliedIndicatorsDomain } from '~/domain/models/domains/remembered-applied-indicators-domain'
import { StrategyScriptParametersDomain } from '~/domain/models/domains/strategy-script-parameters-domain'
import { StrategyScriptParameterDomain } from '~/domain/models/domains/strategy-script-parameter-domain'
import { StrategyScriptParameterFieldDto } from '~/domain/models/dto/strategy-script-parameter-field-dto'
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
    private readonly strategyScriptParameterValuePreferenceProxy:
    IStrategyScriptParameterValuePreferenceProxy,
    private readonly appliedChartIndicatorPreferenceProxy:
    IAppliedChartIndicatorPreferenceProxy,
  ) {}

  /**
   * 上次圖上擺著的那幾支，對照**現在**的策略腳本清單之後交出來。
   *
   * 呼叫端只說「把上次那幾支還原回來」。讀留存、對回一支現在的策略腳本、
   * 丟掉刪掉的與畫不成線的、依宣告重建那幾格、給序號，五件事都在這裡面——
   * **呼叫端不知道留存存在，也不該知道**。
   *
   * 收「現在的策略腳本清單」而不自己去取：那份清單是畫面本來就會取的東西
   * （取不到時圖表照畫），為了還原再打一趟等於讓一個附加功能多花一次往返。
   */
  restoreAppliedIndicators(
    strategyScripts: readonly ChartApplicableStrategyScriptDto[], lastAppliedIndicatorId: number,
  ): AppliedIndicatorDto[] {
    return new RememberedAppliedIndicatorsDomain(
      this.appliedChartIndicatorPreferenceProxy.readAppliedChartIndicators(),
      strategyScripts,
    ).toAppliedIndicatorDtos(lastAppliedIndicatorId)
  }

  /**
   * 把圖上現在擺著的那幾筆記下來，**整份**。
   *
   * 記的是「他要哪幾支、各配什麼值」，不是圖上長什麼樣——算失敗、正在算、
   * 挑了什麼顏色都不在裡面（顏色有自己的記憶）。
   *
   * 整份寫而不是逐筆改：清單的每一次改動（加入、移除、改值）都讓它變成新的一份，
   * 而「第幾筆放在哪裡」這件事一旦讓外面也知道，兩邊算得不一樣時記憶會**安靜地**錯位。
   */
  rememberAppliedIndicators(appliedIndicatorDtos: readonly AppliedIndicatorDto[]): void {
    this.appliedChartIndicatorPreferenceProxy.writeAppliedChartIndicators(
      appliedIndicatorDtos.map(appliedIndicatorDto => appliedIndicatorDto.toRememberedVo()))
  }

  /**
   * 準備一次套用：交出這一支這一次要用的那幾格。
   *
   * 呼叫端只說「我要套用這一支」。讀記憶、對照宣告、丟掉已經不存在的名字、
   * 補上策略腳本的預設值，四件事都在這裡面——**呼叫端不知道記憶存在，也不該知道**。
   */
  prepareAppliedIndicator(strategyScript: ChartApplicableStrategyScriptDto, appliedIndicatorId: number): AppliedIndicatorDto {
    return new AppliedIndicatorDto(
      appliedIndicatorId,
      strategyScript,
      new AppliedIndicatorParametersDomain(
        strategyScript.id,
        strategyScript.parameters,
        this.strategyScriptParameterValuePreferenceProxy).toDtos(),
    )
  }

  /**
   * 把這一次調成的值記下來。
   *
   * 記的是「**這支策略腳本的這個旋鈕**上次被調成什麼」，不是「這一次套用」——
   * 清單本來就不留存，所以下次打開時「這一次」已經不存在了；
   * 能被記住而且有意義的，是「我習慣把這支的期數調成 60」。
   */
  rememberAppliedIndicatorParameters(appliedIndicatorDto: AppliedIndicatorDto): void {
    new AppliedIndicatorParametersDomain(
      appliedIndicatorDto.strategyScript.id,
      appliedIndicatorDto.parameters,
      this.strategyScriptParameterValuePreferenceProxy).remember(appliedIndicatorDto.parameters)
  }

  /**
   * 這幾格在畫面上該長什麼樣子。
   *
   * 「回看根數要整數鍵盤」是業務規則，不是版面問題——與宣告在哪裡編輯無關，
   * 所以與指標計算畫面那一側借用同一份模型，而不是各判斷一次。
   */
  describeAppliedIndicatorParameters(
    parameters: readonly StrategyScriptParameterDto[],
  ): StrategyScriptParameterFieldDto[] {
    return parameters.map((parameter) => {
      const parameterDomain = new StrategyScriptParameterDomain(parameter)

      return new StrategyScriptParameterFieldDto(
        parameter,
        parameterDomain.control(),
        parameterDomain.valueOptions(),
        parameterDomain.inputMode(),
        parameterDomain.step(),
        parameterDomain.validationMessage() !== null)
    })
  }

  /** 這幾格哪裡不對——沒有就是 null。規則與宣告在哪裡編輯無關，所以借用同一份。 */
  validateAppliedIndicatorParameters(
    parameters: readonly StrategyScriptParameterDto[],
  ): string | null {
    return new StrategyScriptParametersDomain(parameters).validationMessage()
  }

  /**
   * 拿一支策略腳本對圖上那批 K 線算一次，交出它該畫的那幾條線。
   *
   * 送出去的是**圖上正在畫的那一批**的每一個條件，因此算回來的值與圖上的 K 線是同一段行情。
   * 顏色在這裡就配好——畫面收到的每一條線都已經知道自己是什麼顏色，
   * 不必也不該自己去查誰挑過什麼。
   */
  async calculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    return this.drawChartIndicator(chartIndicatorRequestDto,
      requestDomain => this.indicatorCalculationProxy.calculateIndicator(requestDomain))
  }

  /**
   * 跟著最新那一根重算：一根走完了，圖上的指標自己重算一次。
   *
   * 與 `calculateChartIndicator` 交出的東西完全相同；差別只在觸發它的是一根 K 線走完，
   * 不是使用者的操作——所以它走 proxy 的另一條路（`recalculateIndicator`）。
   */
  async recalculateChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
  ): Promise<ChartIndicatorDto> {
    return this.drawChartIndicator(chartIndicatorRequestDto,
      requestDomain => this.indicatorCalculationProxy.recalculateIndicator(requestDomain))
  }

  private async drawChartIndicator(
    chartIndicatorRequestDto: ChartIndicatorRequestDto,
    calculate: (requestDomain: IndicatorCalculationRequestDomain) => Promise<IndicatorCalculation>,
  ): Promise<ChartIndicatorDto> {
    const { appliedIndicator } = chartIndicatorRequestDto
    const requestDomain = new IndicatorCalculationRequestDomain(
      new IndicatorCalculationRequestDto(
        chartIndicatorRequestDto.symbol,
        chartIndicatorRequestDto.aggregationInterval,
        chartIndicatorRequestDto.observationWindow,
        // 算式一個字都不送：圖表套用的是一支**已存的**策略腳本，指名它就夠了——
        // 而從市集加入的那些根本沒有算式可以送，指名是唯一跑得動的方式。
        '',
        appliedIndicator.strategyScript.resultType,
        // **這一次**的值，不是策略腳本記著的預設值。同一支策略腳本的另一筆套用
        // 可能填著完全不同的數字，而它們必須各自算各自的。
        appliedIndicator.parameters,
        appliedIndicator.strategyScript.id,
      ))

    const indicatorCalculation = await calculate(requestDomain)

    const chartIndicatorDomain = new ChartIndicatorDomain(
      // 線的記憶身分掛在**策略腳本**上，不在這一次套用上：顏色記的是跨越每一次打開畫面的習慣。
      appliedIndicator.strategyScript.id,
      indicatorCalculation,
      this.chartLineColorPreferenceProxy,
      chartIndicatorRequestDto.drawnLines,
    )

    return new ChartIndicatorDto(
      // 畫出來的東西屬於**這一次套用**：移除哪一筆、覆蓋哪一筆都認它。
      appliedIndicator.id,
      appliedIndicator.strategyScript.name,
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
