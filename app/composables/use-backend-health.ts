import type { BackendHealthDto } from '~/domain/models/dto/backend-health-dto'
import { BackendUnreachableError } from '~/domain/errors/backend-unreachable-error'

/**
 * 全站共用的「後端還活著嗎」。
 *
 * 後端可用是這個操作台每一個功能的前提，所以答案要一直掛在側欄上，
 * 而不是只有進到「連線狀態」那一頁才問得到。它因此是跨畫面的畫面狀態：
 * 一次檢查的結果由側欄的燈與那一頁的大字共用，兩邊不會各說一套。
 *
 * 只在瀏覽器端檢查（`onMounted`）——伺服器端連得到後端不代表使用者的瀏覽器連得到，
 * 那正是這個燈要回答的問題。
 */
export function useBackendHealth() {
  const { $backendHealthApplication } = useNuxtApp()

  const health = useState<BackendHealthDto | null>('backend-health', () => null)
  const checking = useState('backend-health-checking', () => false)
  const errorMessage = useState<string | null>('backend-health-error', () => null)
  const checked = useState('backend-health-checked', () => false)

  async function checkBackendHealth() {
    checking.value = true
    errorMessage.value = null

    try {
      health.value = await $backendHealthApplication.checkBackendHealth()
    }
    catch (error: unknown) {
      // 哨兵錯誤分流：等同後端 controller 把領域錯誤對映成狀態碼。
      // 兩個取用它的地方要說同一句話，所以這句話寫在這裡，不寫在畫面上。
      errorMessage.value = error instanceof BackendUnreachableError
        ? '連不上後端 go-trading API，請確認它已啟動，且本站來源在它的 CORS_ALLOWED_ORIGINS 名單內。'
        : '檢查後端狀態時發生未預期的錯誤。'
      health.value = null
    }
    finally {
      checking.value = false
    }
  }

  onMounted(() => {
    // 一個畫面上有兩個地方取用它（側欄的燈與那一頁的大字），第一次檢查只做一次。
    if (checked.value) {
      return
    }

    checked.value = true
    void checkBackendHealth()
  })

  return { health, checking, errorMessage, checkBackendHealth }
}
