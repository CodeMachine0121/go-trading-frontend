import type { SymbolScreeningProfileWriteDto } from '~/domain/models/dto/symbol-screening-profile-write-dto'
import type { SymbolScreeningParameterValueVo } from '~/domain/models/vo/symbol-screening-parameter-value-vo'

const SYMBOL_SEPARATOR = /[,，]/

export class SymbolScreeningProfileWriteDomain {
  readonly id: number | null
  readonly name: string
  readonly strategyScriptId: number
  readonly aggregationInterval: string
  readonly tradingMode: string
  readonly leverage: string | null
  readonly entryCostPercentage: string | null
  readonly slippagePercentage: string | null
  readonly historyDays: number | null
  readonly segmentCount: number | null
  readonly minimumTradeCount: number | null
  readonly minimumAverageDailyQuoteVolume: string | null
  readonly baselineSymbols: readonly string[]
  readonly parameterValues: readonly SymbolScreeningParameterValueVo[]

  constructor(writeDto: SymbolScreeningProfileWriteDto) {
    // Blank figures stay unsent so the system fills in its own defaults.
    const figureOrNull = (text: string) => (text.trim() === '' ? null : text.trim())
    const wholeNumberOrNull = (text: string) => {
      const figure = figureOrNull(text)

      return figure === null ? null : Number(figure)
    }

    this.id = writeDto.id
    this.name = writeDto.name.trim()
    this.strategyScriptId = writeDto.strategyScriptId
    this.aggregationInterval = writeDto.aggregationInterval
    this.tradingMode = writeDto.tradingMode
    this.leverage = figureOrNull(writeDto.leverage)
    this.entryCostPercentage = figureOrNull(writeDto.entryCostPercentage)
    this.slippagePercentage = figureOrNull(writeDto.slippagePercentage)
    this.historyDays = wholeNumberOrNull(writeDto.historyDays)
    this.segmentCount = wholeNumberOrNull(writeDto.segmentCount)
    this.minimumTradeCount = wholeNumberOrNull(writeDto.minimumTradeCount)
    this.minimumAverageDailyQuoteVolume = figureOrNull(writeDto.minimumAverageDailyQuoteVolume)
    this.baselineSymbols = writeDto.baselineSymbols
      .split(SYMBOL_SEPARATOR)
      .map(symbol => symbol.trim().toUpperCase())
      .filter(symbol => symbol !== '')
    this.parameterValues = writeDto.parameterValues
  }
}
