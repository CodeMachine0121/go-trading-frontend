import Decimal from 'decimal.js'
import { describe, expect, it } from 'vitest'
import { MaintenanceMarginRateDomain } from '~/domain/models/domains/maintenance-margin-rate-domain'

function rate(value: string | number, ceiling: string) {
  return new MaintenanceMarginRateDomain(
    new Decimal(value), '維持保證金率', new Decimal(ceiling))
}

describe('MaintenanceMarginRateDomain', () => {
  it.each([
    ['留白——沒有意見，由後端給它的預設值', '0', '20'],
    ['市場常見的那個數字', '0.5', '20'],
    ['很緊但還在上限之內', '19', '20'],
  ])('%s 講得通', (_name, value, ceiling) => {
    expect(rate(value, ceiling).validationMessage()).toBeNull()
  })

  it('負的維持保證金等於倉位賠光了還撐得住', () => {
    expect(rate('-1', '20').validationMessage())
      .toBe('維持保證金率不得為負——負的維持保證金等於倉位賠光了還撐得住')
  })

  it.each([
    ['正好等於上限——強平距離變成零', '20'],
    ['超過上限', '25'],
  ])('%s 就講不通，而且說出最多能填多少', (_name, value) => {
    const rejection = rate(value, '20').validationMessage()

    // 被擋下來的人要知道該改成什麼，而不是自己一個一個試。
    expect(rejection).toContain('必須小於 20%')
    expect(rejection).toContain('在開倉那一棒就已經撐不住')
  })

  it.each([
    ['除不盡的上限印成四位有效數字', '33.33333333333333333333', '33.33%'],
    // 這一列說的是**四位有效數字，不是兩位小數**：兩位小數在這裡會印成 0.33，
    // 而再小一點就會印成 0——一個沒有人進得去的上限。
    ['小於一的上限也留得住有效位數', '0.33333333333333333333', '0.3333%'],
    ['整數的上限不多印小數點', '20', '20%'],
  ])('%s', (_name, ceiling, expected) => {
    expect(rate('40', ceiling).validationMessage()).toContain('必須小於 ' + expected)
  })

  it('負零就是零', () => {
    expect(rate('-0', '20').validationMessage()).toBeNull()
  })

  it('根本不是一個數字時說得出來', () => {
    expect(rate(Number.NaN, '20').validationMessage()).toBe('維持保證金率請填一個數字')
  })

  it.each([
    ['留白就不上線，由後端給預設值', '0', false],
    ['說了就上線', '0.5', true],
  ])('%s', (_name, value, expected) => {
    expect(rate(value, '20').isSet).toBe(expected)
  })
})
