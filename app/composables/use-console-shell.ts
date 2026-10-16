import { useI18n } from 'vue-i18n'

/**
 * 每一頁共用的那一圈接線：連線燈、帳號、時區、顯示語言、現貨／合約開關、外觀、助手鍵、
 * 以及這一頁的標題。
 *
 * 操作台版型與看盤工作區版型擺的位置不同（一個是頂欄與側欄，一個是主選單），
 * 但接的是同一圈線——寫在這裡一次，兩個版型都只負責擺。
 */
export function useConsoleShell() {
  const route = useRoute()
  const { $marketCounterpartApplication } = useNuxtApp()
  const { t } = useI18n()

  const timeZone = useSelectedTimeZone()
  const displayLanguage = useDisplayLanguage()
  const backendHealth = useBackendHealth()
  const userSession = useUserSession()
  const appearance = useAppearance()
  const { openDrawer } = useAssistantDrawer()

  const counterpart = computed(() => $marketCounterpartApplication.describeCounterpart(route.path))

  // 到了哪一邊的頁面就記住哪一邊；導覽上有兩邊的那幾格跟著它指路，不必每一頁再切一次。
  const { followPath, pathOnMarketSide } = useMarketSide()
  watch(() => route.path, followPath, { immediate: true })

  const SIDE_AWARE_DESTINATIONS = ['/k-candles/chart', '/k-candles', '/strategy-scripts', '/strategy-bots', '/spot-trade-journal']
  const destinationPaths = computed(
    () => Object.fromEntries(SIDE_AWARE_DESTINATIONS.map(path => [path, pathOnMarketSide(path)])))
  const title = computed(() => route.meta.consoleTitleKey === undefined ? '' : t(route.meta.consoleTitleKey))
  const subtitle = computed(
    () => route.meta.consoleSubtitleKey === undefined ? undefined : t(route.meta.consoleSubtitleKey))

  // 瀏覽器分頁上的標題也是這一頁的標題，跟著語言換。
  useHead({ title })

  return {
    route,
    counterpart,
    destinationPaths,
    title,
    subtitle,
    ...timeZone,
    ...displayLanguage,
    ...backendHealth,
    ...userSession,
    ...appearance,
    openDrawer,
  }
}
