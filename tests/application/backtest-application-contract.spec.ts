import Decimal from 'decimal.js'
import { describe, expect, it, vi } from 'vitest'
import { BacktestApplication } from '~/application/backtest-application'
import { BacktestService } from '~/domain/service/backtest-service'
import type { IBacktestProxy } from '~/domain/interface/i-backtest-proxy'
import { Backtest } from '~/domain/models/entities/backtest'
import { BacktestRequestDto } from '~/domain/models/dto/backtest-request-dto'
import { ContractBacktestTermsDto } from '~/domain/models/dto/contract-backtest-terms-dto'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

const START_TIME = new Date('2026-08-06T00:00:00Z')

function emptyBacktest(): Backtest {
  return new Backtest(
    'BTCUSDT', '1h', START_TIME, START_TIME, 0, new Decimal(10000), new Decimal(10000),
    0, 0, null, 0, 0, 0, 0, new Decimal(0), [], [])
}

function applicationWith(proxy: IBacktestProxy): BacktestApplication {
  return new BacktestApplication(new BacktestService(proxy))
}

function buildProxy(): IBacktestProxy {
  return {
    runBacktest: vi.fn().mockResolvedValue(emptyBacktest()),
    runTradingStrategyBacktest: vi.fn().mockResolvedValue(emptyBacktest()),
    runContractBacktest: vi.fn().mockResolvedValue(emptyBacktest()),
    runContractTradingStrategyBacktest: vi.fn().mockResolvedValue(emptyBacktest()),
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

    await expect(applicationWith(proxy).runContractBacktest(
      scriptRequest(''), new ContractBacktestTermsDto(new Decimal(5), new Decimal(0), 'longShort')))
      .rejects.toBeInstanceOf(BacktestFieldError)
    expect(proxy.runContractBacktest).not.toHaveBeenCalled()
  })

  it('交易模式選單三種，第一個是多空反手', () => {
    const options = applicationWith(buildProxy()).listContractTradingModeOptions()

    expect(options.map(option => option.label)).toEqual(['多空反手', '只做多', '只做空'])
  })

  it.each([
    { marketDataKind: 'kCandle' as const, mentions: '重演只做現貨' },
    { marketDataKind: 'contractKCandle' as const, mentions: '強平看標記價格' },
  ])('$marketDataKind 讀的是它自己那一份規則', ({ marketDataKind, mentions }) => {
    const titles = applicationWith(buildProxy()).listBacktestRules(marketDataKind).map(rule => rule.title)

    expect(titles).toContain(mentions)
  })
})
