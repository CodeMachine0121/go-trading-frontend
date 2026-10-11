import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BacktestRunStatusBadge from '~/components/molecules/BacktestRunStatusBadge.vue'
import { buildBacktestRun } from '../../fixtures/backtest-run'

function mountBadge(overrides: Parameters<typeof buildBacktestRun>[0]) {
  return mount(BacktestRunStatusBadge, { props: { run: buildBacktestRun(overrides).toDomain().toDto() } })
}

describe('BacktestRunStatusBadge', () => {
  it.each([
    { status: 'running', progressPercent: 40, expected: '進行中 · 40%' },
    { status: 'queued', progressPercent: 0, expected: '排隊中' },
    { status: 'succeeded', progressPercent: 100, expected: '完成' },
    { status: 'failed', progressPercent: 70, expected: '失敗' },
  ])('$status 寫成「$expected」：進度只在領域說要寫時才寫', ({ status, progressPercent, expected }) => {
    expect(mountBadge({ status, progressPercent }).get('[data-testid="backtest-run-status"]').text()).toBe(expected)
  })
})
