import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'
import type { IIndicatorCalculationProxy } from '~/domain/interface/i-indicator-calculation-proxy'
import { ChartIndicatorDomain } from '~/domain/models/domains/chart-indicator-domain'
import { IndicatorCalculationRequestDomain } from '~/domain/models/domains/indicator-calculation-request-domain'
import { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import type { ChartIndicatorRequestDto } from '~/domain/models/dto/chart-indicator-request-dto'
import { ChartLineColorOptionDto } from '~/domain/models/dto/chart-line-color-option-dto'
import { IndicatorCalculationRequestDto } from '~/domain/models/dto/indicator-calculation-request-dto'
import type { IndicatorValueVo } from '~/domain/models/vo/indicator-value-vo'
import { CHART_LINE_COLORS } from '~/domain/models/vo/chart-line-color-vo'

/**
 * Domain Service：圖表指標的編排。
 * 公開用例方法之間互不呼叫。
 */
export class ChartIndicatorService {
  constructor(
    private readonly indicatorCalculationProxy: IIndicatorCalculationProxy,
    private readonly chartLineColorPreferenceProxy: IChartLineColorPreferenceProxy,
  ) {}

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
    const requestDomain = new IndicatorCalculationRequestDomain(
      new IndicatorCalculationRequestDto(
        chartIndicatorRequestDto.symbol,
        chartIndicatorRequestDto.aggregationInterval,
        String(chartIndicatorRequestDto.candleCount),
        chartIndicatorRequestDto.strategy.content.scriptBody,
        chartIndicatorRequestDto.strategy.content.resultType,
        chartIndicatorRequestDto.endTime,
      ))

    const indicatorCalculation
      = await this.indicatorCalculationProxy.calculateIndicator(requestDomain)

    const chartIndicatorDomain = new ChartIndicatorDomain(
      chartIndicatorRequestDto.strategy.id,
      indicatorCalculation,
      this.rememberedColorTokensOf(
        chartIndicatorRequestDto.strategy.id, indicatorCalculation.indicatorValues),
      chartIndicatorRequestDto.takenColorTokens,
    )

    return new ChartIndicatorDto(
      chartIndicatorRequestDto.strategy.id,
      chartIndicatorRequestDto.strategy.name,
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

  /**
   * 這一支算出來的每個指標名稱，各自挑過什麼顏色。
   *
   * 只問這一次真的出現的那幾個名稱：算式改過之後，舊名稱記著的顏色留在儲存裡不礙事，
   * 而去把它們一併撈出來只會讓「已經用掉的顏色」多出幾個其實沒人在用的。
   */
  private rememberedColorTokensOf(
    strategyId: number, indicatorValues: readonly IndicatorValueVo[],
  ): Map<string, string> {
    const rememberedColorTokens = new Map<string, string>()

    for (const indicatorValue of indicatorValues) {
      const lineKey = `${strategyId}:${indicatorValue.name}`
      const rememberedColorToken = this.chartLineColorPreferenceProxy.readColorToken(lineKey)
      if (rememberedColorToken !== null) {
        rememberedColorTokens.set(lineKey, rememberedColorToken)
      }
    }

    return rememberedColorTokens
  }
}
