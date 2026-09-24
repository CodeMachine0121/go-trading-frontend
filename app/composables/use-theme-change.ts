/**
 * 外觀換了的那一刻，通知一個畫在畫布上的東西重新上色。
 *
 * 大部分畫面的顏色是 CSS 變數，換外觀時自己就換了；但圖表把顏色**抄進畫布**，
 * 抄完就不再讀——它得被告知「現在是另一組了，再讀一次」。
 *
 * 它看的是 `<html data-theme>` 這個屬性本身，而不是外觀那一份共用狀態：
 * 顏色真的換掉的時刻就是那個屬性改變的時刻，而且這樣元件不必認識外觀的任何規則。
 */
export function useThemeChange(onThemeChange: () => void): void {
  let observer: MutationObserver | null = null

  onMounted(() => {
    observer = new MutationObserver(onThemeChange)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  })

  onBeforeUnmount(() => {
    observer?.disconnect()
    observer = null
  })
}
