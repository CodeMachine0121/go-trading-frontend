import { describe, expect, it, vi } from 'vitest'
import { ChartLineColorArrangementDomain } from '~/domain/models/domains/chart-line-color-arrangement-domain'
import { ChartIndicatorDto } from '~/domain/models/dto/chart-indicator-dto'
import { IndicatorLevelDto } from '~/domain/models/dto/indicator-level-dto'
import { IndicatorSeriesDto } from '~/domain/models/dto/indicator-series-dto'
import type { IChartLineColorPreferenceProxy } from '~/domain/interface/i-chart-line-color-preference-proxy'

function levelsOf(appliedIndicatorId: number, lineKeys: string[], colorToken = '--color-chart-line-6') {
  return new ChartIndicatorDto(appliedIndicatorId, '指標',
    lineKeys.map(lineKey => new IndicatorLevelDto(lineKey, lineKey, colorToken, 1)), [])
}

function seriesOf(appliedIndicatorId: number, lineKeys: string[]) {
  return new ChartIndicatorDto(appliedIndicatorId, '指標', [],
    lineKeys.map(lineKey => new IndicatorSeriesDto(lineKey, lineKey, '--color-chart-line-6', [])))
}

function preferenceOf(remembered: Partial<Record<string, string>> = {}): IChartLineColorPreferenceProxy {
  return {
    readColorToken: vi.fn((lineKey: string) => remembered[lineKey] ?? null),
    writeColorToken: vi.fn(),
  }
}

function colorsOf(chartIndicators: ChartIndicatorDto[]) {
  return chartIndicators.map(chartIndicator => chartIndicator.usedColorTokens)
}

describe('ChartLineColorArrangementDomain', () => {
  it.each([
    {
      situation: '沒挑過顏色的依清單順序取第一個沒被前面用掉的',
      indicators: [levelsOf(1, ['7:均線']), levelsOf(2, ['8:上軌', '8:下軌'])],
      remembered: {},
      expected: [['--color-chart-line-1'], ['--color-chart-line-2', '--color-chart-line-3']],
    },
    {
      situation: '原本帶著什麼顏色不影響結果',
      indicators: [levelsOf(1, ['7:均線'], '--color-chart-line-5'), levelsOf(2, ['8:布林'], '--color-chart-line-1')],
      remembered: {},
      expected: [['--color-chart-line-1'], ['--color-chart-line-2']],
    },
    {
      situation: '挑過的顏色照舊，後面的避開它',
      indicators: [levelsOf(1, ['7:均線']), levelsOf(2, ['8:布林'])],
      remembered: { '7:均線': '--color-chart-line-4' },
      expected: [['--color-chart-line-4'], ['--color-chart-line-1']],
    },
    {
      situation: '挑過的顏色即使被前面用掉也照樣採用',
      indicators: [levelsOf(1, ['7:均線']), levelsOf(2, ['8:布林'])],
      remembered: { '8:布林': '--color-chart-line-1' },
      expected: [['--color-chart-line-1'], ['--color-chart-line-1']],
    },
    {
      situation: '同一條線擺兩筆：清單上第一筆用挑過的，第二筆換一個沒被用掉的',
      indicators: [levelsOf(1, ['7:均線']), levelsOf(2, ['7:均線'])],
      remembered: { '7:均線': '--color-chart-line-4' },
      expected: [['--color-chart-line-4'], ['--color-chart-line-1']],
    },
    {
      situation: '曲線也照清單順序配色',
      indicators: [seriesOf(1, ['7:快線']), seriesOf(2, ['8:慢線'])],
      remembered: {},
      expected: [['--color-chart-line-1'], ['--color-chart-line-2']],
    },
    {
      situation: '一條線都沒畫的那一支不佔顏色',
      indicators: [levelsOf(1, []), levelsOf(2, ['8:布林'])],
      remembered: {},
      expected: [[], ['--color-chart-line-1']],
    },
  ])('$situation', ({ indicators, remembered, expected }) => {
    const arranged = new ChartLineColorArrangementDomain(indicators, preferenceOf(remembered))
      .toChartIndicatorDtos()

    expect(colorsOf(arranged)).toEqual(expected)
  })

  it('配色之外的一切原樣交回，順序照給的清單', () => {
    const arranged = new ChartLineColorArrangementDomain(
      [levelsOf(2, ['8:布林']), levelsOf(1, ['7:均線'])], preferenceOf()).toChartIndicatorDtos()

    expect(arranged.map(one => one.appliedIndicatorId)).toEqual([2, 1])
    expect(arranged.map(one => one.drawnLineKeys)).toEqual([['8:布林'], ['7:均線']])
    expect(arranged[0]?.levels[0]?.value).toBe(1)
  })
})
