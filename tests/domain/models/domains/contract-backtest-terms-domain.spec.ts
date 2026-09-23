import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { ContractBacktestTermsDomain } from '~/domain/models/domains/contract-backtest-terms-domain'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import type { ContractTradingMode } from '~/domain/models/vo/contract-trading-mode-vo'

function termsOf(leverage: string, slippagePercentage: string, tradingMode: string | null = 'longShort') {
  return new ContractBacktestTermsDto(
    new Decimal(leverage), new Decimal(slippagePercentage), tradingMode as ContractTradingMode | null)
}

function refusalOf(termsDto: ContractBacktestTermsDto): BacktestFieldError {
  try {
    new ContractBacktestTermsDomain(termsDto)
  }
  catch (error: unknown) {
    if (error instanceof BacktestFieldError) {
      return error
    }
  }

  throw new Error('這一組應該要被擋下才對')
}

describe('ContractBacktestTermsDomain', () => {
  it.each([
    { leverage: '0', slippage: '0', leverageIsSet: false, slippageIsSet: false },
    { leverage: '1', slippage: '0.1', leverageIsSet: true, slippageIsSet: true },
    { leverage: '5', slippage: '100', leverageIsSet: true, slippageIsSet: true },
  ])('槓桿 $leverage、滑點 $slippage 送得出去', ({ leverage, slippage, leverageIsSet, slippageIsSet }) => {
    const termsDomain = new ContractBacktestTermsDomain(termsOf(leverage, slippage))

    expect(termsDomain.leverageIsSet).toBe(leverageIsSet)
    expect(termsDomain.slippageIsSet).toBe(slippageIsSet)
  })

  it.each([
    { leverage: '0.5', slippage: '0', field: 'leverage', message: '槓桿倍數不得小於 1 倍' },
    { leverage: 'NaN', slippage: '0', field: 'leverage', message: '槓桿倍數請填一個數字' },
    { leverage: '1', slippage: '-1', field: 'slippage', message: '滑點不得為負' },
    { leverage: '1', slippage: '101', field: 'slippage', message: '滑點不得超過 100%' },
    { leverage: '1', slippage: 'NaN', field: 'slippage', message: '滑點請填一個數字' },
  ])('槓桿 $leverage、滑點 $slippage 就地擋下，落在 $field', ({ leverage, slippage, field, message }) => {
    const refusal = refusalOf(termsOf(leverage, slippage))

    expect(refusal.field).toBe(field)
    expect(refusal.message).toContain(message)
  })

  it('認不得的交易模式擋在交易模式那一格', () => {
    const refusal = refusalOf(termsOf('1', '0', 'spot'))

    expect(refusal.field).toBe('tradingMode')
  })

  it('交易模式由交易策略決定時不問它', () => {
    expect(new ContractBacktestTermsDomain(termsOf('3', '0', null)).tradingMode).toBeNull()
  })
})
