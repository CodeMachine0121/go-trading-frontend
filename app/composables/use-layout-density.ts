import type { LayoutDensityApplication } from '~/application/layout-density-application'

/**
 * 還沒量到視窗以前，先當成一台坐著用的機器。
 *
 * 伺服器端沒有視窗可以量，而它畫出來的那一版必須是**某一種**樣子。
 * 選寬的那一種，是因為猜錯的代價不對稱：猜寬了，手機使用者在掛載後看到一次補正；
 * 猜窄了，桌機使用者會先看到一個蓋住畫面的抽屜與一張改不動的工作檯，
 * 而那比補正難解釋得多。
 */
const ASSUMED_DESKTOP_WIDTH_PIXELS = 1280

/**
 * 現在還有幾個元件在看著視窗大小。
 *
 * 監聽器只掛一次：十個元件各掛一個，視窗每動一格就跑十次同樣的事。
 * 它只在瀏覽器這一側增減（`onMounted` 在伺服器端不會跑），
 * 所以伺服器端的請求之間不會互相看到對方的計數。
 */
let watcherCount = 0

/**
 * 掛上去的是**哪一個**函式。
 *
 * 少了它，最後一個元件卸載時會拿自己的那一份去取消監聽，
 * 而掛上去的是第一個元件的那一份——取消不掉，於是留下一個對著已消失元件喊話的監聽器。
 */
let registeredWatcher: (() => void) | null = null

/**
 * 現在這個寬度代表什麼。
 *
 * **沒有任何元件自己去問寬度。** 元件問的是「我編得動嗎」「導覽是不是抽屜」——
 * 那些答案由 domain 給，而兩道分界的數字一個都不會流出 domain。
 *
 * 這不是全站唯一讀 `window` 大小的地方：助手那顆浮動鍵與抽屜寬度（`app.vue` 裡
 * 那一個 resize 監聽）也各自讀它，因為那兩樣要的是**視窗的長寬本身**，不是
 * 「這個寬度代表什麼」。要收成同一份，得先讓這裡連高度一起管，
 * 而那會動到助手那一側的兩個 composable 與它們的測試——留到真的需要高度時再做。
 *
 * 純視覺的鬆緊不走這條路：那一套由樣式的 token 自己換，
 * 伺服器端畫出來的那一版就已經是對的，不需要補正、不會閃動。
 */
export function useLayoutDensity(
  /**
   * 要問的是哪一個 application。預設就是組裝根注入的那一個；
   * 明寫成參數是為了讓這裡的編排測得到。
   */
  layoutDensityApplication: LayoutDensityApplication
    = useNuxtApp().$layoutDensityApplication,
) {
  /**
   * 共用狀態裡放的是**一個數字**，不是任何物件——這一份要從伺服器端交到瀏覽器端，
   * 而能被交過去的只有純資料。
   */
  const viewportWidth = useState('viewport-width', () => ASSUMED_DESKTOP_WIDTH_PIXELS)

  const layoutDensity = computed(
    () => layoutDensityApplication.resolveLayoutDensity(viewportWidth.value))

  function readViewportWidth(): void {
    viewportWidth.value = window.innerWidth
  }

  onMounted(() => {
    readViewportWidth()

    if (watcherCount === 0) {
      registeredWatcher = readViewportWidth
      window.addEventListener('resize', registeredWatcher)
    }

    watcherCount += 1
  })

  onBeforeUnmount(() => {
    watcherCount -= 1

    if (watcherCount === 0 && registeredWatcher !== null) {
      window.removeEventListener('resize', registeredWatcher)
      registeredWatcher = null
    }
  })

  return { layoutDensity }
}
