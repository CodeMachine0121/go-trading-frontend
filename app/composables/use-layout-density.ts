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

  /**
   * 交出去的那一份答案。
   *
   * 它**不是** computed：computed 會在寬度每動一格時生出一份新的答案，
   * 而拿著它的那幾個畫面看的是物件本身變沒變，不是內容變沒變——
   * 於是使用者拖動視窗邊緣的那一整秒裡，三棵樹會各重繪六十次，
   * 而那五個布林從頭到尾一個都沒變。只有答案真的不一樣時才換掉它。
   */
  const layoutDensity = shallowRef(
    layoutDensityApplication.resolveLayoutDensity(viewportWidth.value))

  watch(viewportWidth, (width) => {
    const answers = layoutDensityApplication.resolveLayoutDensity(width)

    if (!layoutDensity.value.sameAs(answers)) {
      layoutDensity.value = answers
    }
  })

  function readViewportWidth(): void {
    viewportWidth.value = window.innerWidth
  }

  // 每個看著的元件掛自己的那一份，收起來時收自己的那一份。
  //
  // 一度改成「全域數一數，只掛一個」，想省下重複的監聽。那個計數器是個陷阱：
  // Vue 會替一個**建立了但從未掛載**的元件呼叫卸載那一段（例如還沒解析完就被
  // 換掉的頁面），於是只減不加，數字掉到負的——從那一刻起「等於零」再也不成立，
  // 整個 app 就靜靜地不再反應視窗大小，而畫面上看不出任何異狀。
  //
  // 重複掛幾個監聽器的代價是幾次整數寫入，而且寫的是同一個值，Vue 連一次重算都不會做。
  // 那個代價遠小於一個會讓整站失效、又只在極少數時序下才發作的計數器。
  onMounted(() => {
    readViewportWidth()
    window.addEventListener('resize', readViewportWidth)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('resize', readViewportWidth)
  })

  return { layoutDensity }
}
