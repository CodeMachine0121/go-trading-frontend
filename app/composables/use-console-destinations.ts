import { useI18n } from 'vue-i18n'

/**
 * 操作台的每一個去處，與「現在人在不在這一格」。
 *
 * 側欄（操作台版型）與看盤工作區的主選單列的是同一份——兩份各寫一次，
 * 遲早會有一邊多了一個去處而另一邊不知道。
 *
 * **每個去處只佔一格，但認得兩邊的路**：人在合約 K 線圖表上時「行情圖表」照樣亮著。
 */
export function useConsoleDestinations() {
  const { t } = useI18n()
  const route = useRoute()

  const destinations = computed(() => [
    { to: '/k-candles/chart', label: t('shell.navigation.chart'), icon: 'candles', paths: ['/k-candles/chart', '/contract-k-candles/chart'], nested: false },
    { to: '/k-candles', label: t('shell.navigation.kCandleData'), icon: 'table', paths: ['/k-candles', '/contract-k-candles'], nested: false },
    { to: '/strategy-scripts', label: t('shell.navigation.strategyScripts'), icon: 'code', paths: ['/strategy-scripts', '/contract-strategy-scripts'], nested: false },
    { to: '/trading-strategies', label: t('shell.navigation.tradingStrategies'), icon: 'flow', paths: ['/trading-strategies'], nested: true },
    { to: '/backtest-runs', label: t('shell.navigation.backtestRuns'), icon: 'history', paths: ['/backtest-runs'], nested: false },
    { to: '/strategy-bots', label: t('shell.navigation.strategyBots'), icon: 'bot', paths: ['/strategy-bots', '/contract-strategy-bots'], nested: true },
    { to: '/spot-trade-journal', label: t('shell.navigation.tradeJournal'), icon: 'journal', paths: ['/spot-trade-journal', '/contract-trade-journal'], nested: true },
    { to: '/marketplace', label: 'Marketplace', icon: 'store', paths: ['/marketplace'], nested: false },
  ] as const)

  const settingsDestination = computed(() => (
    { to: '/settings', label: t('shell.navigation.settings'), icon: 'settings', paths: ['/settings'], nested: false } as const))

  function isCurrent(destination: { paths: readonly string[], nested: boolean }): boolean {
    return destination.paths.some(path => route.path === path
      || (destination.nested && route.path.startsWith(`${path}/`)))
  }

  return { destinations, settingsDestination, isCurrent }
}
