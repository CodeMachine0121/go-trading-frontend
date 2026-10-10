import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'
import { buildBacktestRun, buildBacktestRunProxy } from '../fixtures/backtest-run'

const START_TIME = new Date('2026-08-06T00:00:00Z')

function applicationWith(proxy: IBacktestProxy): BacktestApplication {
  return new BacktestApplication(new BacktestService(proxy, buildBacktestRunProxy()))
}

function buildProxy(): IBacktestProxy {
  return {
    submitBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
    submitContractTradingStrategyBacktest: vi.fn().mockResolvedValue(buildBacktestRun()),
  }
}

function scriptRequest(symbol = 'BTCUSDT'): BacktestRequestDto {
  return new BacktestRequestDto(
    symbol, '1h', START_TIME, START_TIME, 'return indicator.Buy', 'signal', [],
    new Decimal(10000), 'allIn', new Decimal(0),
    new Decimal(0), new Decimal(0), new Decimal(0), new Decimal(0))
}

describe('BacktestApplication 的合約重演', () => {
  it('現貨那幾格照現貨的規則把關，不合法就不送出', async () => {
    const proxy = buildProxy()

    await expect(applicationWith(proxy).submitContractBacktest(
      scriptRequest(''), new ContractBacktestTermsDto(new Decimal(5), new Decimal(0), 'longShort')))
      .rejects.toBeInstanceOf(BacktestFieldError)
    expect(proxy.submitContractBacktest).not.toHaveBeenCalled()
  })

  it('交易模式選單三種，第一個是多空反手', () => {
    const options = applicationWith(buildProxy()).listContractTradingModeOptions()

    expect(options.map(option => option.label.in('zh-TW'))).toEqual(['多空反手', '只做多', '只做空'])
  })

  it.each([
    { marketDataKind: 'kCandle' as const, mentions: '重演只做現貨' },
    { marketDataKind: 'contractKCandle' as const, mentions: '強平看標記價格' },
  ])('$marketDataKind 讀的是它自己那一份規則', ({ marketDataKind, mentions }) => {
    const titles = applicationWith(buildProxy()).listBacktestRules(marketDataKind).map(rule => rule.title.in('zh-TW'))

    expect(titles).toContain(mentions)
  })
})
