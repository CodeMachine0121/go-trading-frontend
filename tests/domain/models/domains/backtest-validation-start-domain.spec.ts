import { describe, expect, it } from 'vitest'
import { BacktestValidationStartDomain } from '~/domain/models/domains/backtest-validation-start-domain'
import { BacktestFieldError } from '~/domain/errors/backtest-field-error'

const START_TIME = new Date('2026-01-01T00:00:00Z')
const END_TIME = new Date('2026-01-31T23:59:00Z')

describe('BacktestValidationStartDomain', () => {
  it.each([
    ['留白', null],
    ['落在期間之內', new Date('2026-01-21T00:00:00Z')],
  ])('%s時放行', (_, validationStartTime) => {
    expect(() => new BacktestValidationStartDomain(validationStartTime, START_TIME, END_TIME).validate())
      .not.toThrow()
  })

  it.each([
    ['等於期間起點', START_TIME],
    ['早於期間起點', new Date('2025-12-31T00:00:00Z')],
    ['等於期間終點', END_TIME],
    ['晚於期間終點', new Date('2026-02-05T00:00:00Z')],
  ])('%s時指著驗證起點那一格拒絕', (_, validationStartTime) => {
    const validate = () => new BacktestValidationStartDomain(validationStartTime, START_TIME, END_TIME).validate()

    expect(validate).toThrow(BacktestFieldError)
    expect(validate).toThrow('驗證起點必須落在期間之內（晚於起點、早於終點）')
    try {
      validate()
    }
    catch (error: unknown) {
      expect((error as BacktestFieldError).field).toBe('validationStartTime')
    }
  })
})
