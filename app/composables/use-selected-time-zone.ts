import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

/**
 * 全站共用的「目前選定的時區」。
 *
 * 這是畫面狀態，不是資料：頁面取用它、把選定的時區往下傳給元件，
 * 元件自己不來拿。它只呼叫 Application，不跨層。
 *
 * 共用的是**識別字**而不是選定的那個物件——跨越伺服器端與瀏覽器端的狀態會被序列化，
 * 帶著換算方法的物件過不去（到了瀏覽器端只剩欄位）。識別字過得去，
 * 要說時間時再用它換回帶著換算能力的形狀。
 *
 * 記住的時區只有瀏覽器有，因此初值一律是預設的那一個（世界標準時間），
 * 掛載後才讀回——否則伺服器端與瀏覽器端會對同一個瞬間有兩種說法。
 */
export function useSelectedTimeZone() {
  const { $timeZoneApplication } = useNuxtApp()

  const selectableTimeZones = $timeZoneApplication.listSelectableTimeZones()
  const selectedIdentifier = useState(
    'selected-time-zone-identifier', () => selectableTimeZones[0].identifier)
  const restored = useState('selected-time-zone-restored', () => false)

  const selectedTimeZone = computed<TimeZoneDto>(
    () => $timeZoneApplication.findTimeZone(selectedIdentifier.value))

  onMounted(() => {
    // 一個畫面上會有好幾個地方取用它，記住的那一個讀回一次就夠。
    if (restored.value) {
      return
    }

    restored.value = true
    selectedIdentifier.value = $timeZoneApplication.restoreSelectedTimeZone().identifier
  })

  function selectTimeZone(identifier: string) {
    selectedIdentifier.value = $timeZoneApplication.selectTimeZone(identifier).identifier
  }

  return { selectableTimeZones, selectedTimeZone, selectTimeZone }
}
