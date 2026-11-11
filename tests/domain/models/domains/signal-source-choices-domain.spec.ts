import { describe, expect, it } from 'vitest'
import { SignalSourceChoicesDomain } from '~/domain/models/domains/signal-source-choices-domain'
import { AvailableStrategyScriptsDto } from '~/domain/models/dto/available-strategy-scripts-dto'
import { buildAdoptedStrategyScript, buildStoredStrategyScript } from '../../../fixtures/strategy-script-application'

function choicesOf(
  mine: ReturnType<typeof buildStoredStrategyScript>[],
  adopted: ReturnType<typeof buildAdoptedStrategyScript>[] = [],
) {
  return new SignalSourceChoicesDomain(new AvailableStrategyScriptsDto(
    mine.map(script => script.toDomain().toDto()),
    adopted.map(script => script.toDomain().toDto()))).toDto()
}

describe('SignalSourceChoicesDomain 哪幾支當得了訊號來源', () => {
  it('計算用而且吐訊號的才列，自己的與市集副本都算', () => {
    const choices = choicesOf(
      [
        buildStoredStrategyScript(9, '均線訊號', { resultType: 'signal', usage: 'calculation' }),
        buildStoredStrategyScript(12, '突破線', { resultType: 'signal', usage: 'chart' }),
        buildStoredStrategyScript(11, '吐一個數字的', { resultType: 'float', usage: 'calculation' }),
      ],
      [buildAdoptedStrategyScript(20, '別人的動能', { resultType: 'signal' })],
    )

    expect(choices.options.map(option => [option.value, option.label])).toEqual([[9, '均線訊號'], [20, '別人的動能']])
    expect(choices.shortage).toBeNull()
  })

  it('當不了的那幾支各說原因：圖表用的說圖表用，不吐訊號的說不吐訊號', () => {
    const choices = choicesOf([
      buildStoredStrategyScript(12, '突破線', { resultType: 'signal', usage: 'chart' }),
      buildStoredStrategyScript(11, '吐一個數字的', { resultType: 'float', usage: 'chart' }),
    ])

    expect(choices.unusable[12]?.in('zh-TW')).toBe('突破線（這支是圖表用，當不了訊號來源）')
    expect(choices.unusable[11]?.in('zh-TW')).toBe('吐一個數字的（這支不吐訊號，當不了訊號來源）')
    expect(choices.unusable[12]?.in('en')).toBe('突破線 (a chart script, so it cannot be a signal source)')
  })

  it.each([
    { name: '一支都沒有', mine: [], expected: 'noStrategyScripts' },
    {
      name: '有但沒有一支吐訊號',
      mine: [buildStoredStrategyScript(11, '吐一個數字的', { resultType: 'float', usage: 'calculation' })],
      expected: 'noSignalStrategyScripts',
    },
    {
      name: '吐訊號的全是圖表用',
      mine: [
        buildStoredStrategyScript(12, '突破線', { resultType: 'signal', usage: 'chart' }),
        buildStoredStrategyScript(11, '吐一個數字的', { resultType: 'float', usage: 'calculation' }),
      ],
      expected: 'noCalculationStrategyScripts',
    },
  ])('$name 時說 $expected', ({ mine, expected }) => {
    expect(choicesOf(mine).shortage).toBe(expected)
  })

  it('每一個選項帶著它開得出來的參數名', () => {
    const choices = choicesOf([buildStoredStrategyScript(9, '均線訊號', {
      resultType: 'signal', parameters: [{ name: '回看根數', kind: 'lookbackCount', value: 20 }],
    })])

    expect(choices.options[0]?.parameterNames).toEqual(['回看根數'])
  })
})
