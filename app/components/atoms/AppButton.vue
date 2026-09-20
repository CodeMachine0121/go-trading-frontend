<script setup lang="ts">
// NuxtLink 直接 import 進來，不在 `:is` 裡用 resolveComponent 去找它。
// resolveComponent 是在 render 當下才去查全域註冊表，而這顆按鈕會在任何地方被用到——
// 查不到的時候它不會壞掉，只會印一行警告然後渲染成一個空殼，連結就這樣靜靜不見了。
import { NuxtLink } from '#components'

// 全站唯一的按鈕元件（原子）。
// 畫面上按鈕有幾十種長相，但「按鈕」這個概念只有這一個元件——
// 外觀由使用端透過 variant / size / block 決定，不另外長出 PrimaryButton、DangerButton。
// 需要新的長相時，是在這裡新增一個 variant（並在 token 內補色），不是新增一個元件。
// 詳見 .claude/rules/component-design.md。

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-ghost' | 'accent'
type ButtonSize = 'small' | 'medium' | 'large'

/**
 * 這顆按鈕的外形。
 *
 * `default` 是這個操作台的角——圓得剛好看得出是圓的，不多。
 * `pill` 與 `circle` 是給**對話介面**用的：一句可以點的建議提問是一枚籌碼，
 * 而一顆只放一個圖示、不帶任何文字的小鍵是一個圓。
 * `squircle` 是給**浮在所有內容之上、自己站著的那一枚**用的：
 * 角收得很圓但仍然是方的，於是它與這個終端機介面的面板是同一種語言——
 * 一個正圓會像有人把一顆球忘在畫面上。
 *
 * 它是互斥的外觀，所以是一組列舉而不是幾個布林——`pill` 與 `circle` 同時為真是無意義狀態。
 */
type ButtonShape = 'default' | 'pill' | 'circle' | 'squircle'

const { variant = 'primary', size = 'medium', shape = 'default', block = false, label, to } = defineProps<{
  variant?: ButtonVariant
  size?: ButtonSize
  shape?: ButtonShape
  block?: boolean
  /**
   * 給了它，這顆按鈕就是一條連結——長相一模一樣，但它去得了別的地方。
   *
   * 它在這裡而不是另外開一個 LinkButton，因為「按鈕」在這個操作台上只有一個元件，
   * 而兩個長得一樣的東西遲早會有一個忘記跟著改。
   *
   * 不給按的時候**不要用它**：一個帶著 disabled 的連結照樣點得進去，
   * 而點得進去就等於那條規則只是畫上去的。那種情況用一般的按鈕加 disabled。
   */
  to?: string
  /**
   * 只放圖示、沒有文字時，這顆按鈕叫什麼。
   *
   * **它是必要的，不是裝飾**：一顆只有圖示的按鈕，對讀螢幕的人來說什麼都沒說，
   * 對看得到但不確定那個圖示是什麼意思的人也一樣。給了它，兩種人都問得出答案——
   * 一個從無障礙名稱、一個從滑鼠停留的提示。
   */
  label?: string
}>()

// disabled / type / @click 等原生行為一律走 attribute fallthrough，不重新包一層 props。
</script>

<template>
  <component
    :is="to === undefined ? 'button' : NuxtLink"
    class="app-button"
    :class="[
      `app-button--${variant}`,
      `app-button--${size}`,
      `app-button--${shape}`,
      { 'app-button--block': block, 'app-button--labelled': label !== undefined },
    ]"
    :type="to === undefined ? 'button' : undefined"
    :to="to"
    :aria-label="label"
    :title="label"
  >
    <slot />
  </component>
</template>

<style scoped lang="scss">
.app-button {
  display: inline-flex;
  gap: spacing('2xs');
  align-items: center;
  justify-content: center;
  transition: background-color duration('fast') ease, border-color duration('fast') ease,
    color duration('fast') ease;
  border: 1px solid transparent;
  border-radius: radius('sm');
  cursor: pointer;
  line-height: line-height('tight');
  font-weight: font-weight('medium');
  white-space: nowrap;

  // 窄螢幕上按的是拇指，不是游標。寬螢幕上這一行等於沒有作用。
  @include tap-target;

  // 當成連結用時，底線與瀏覽器的預設顏色會讓它不再像一顆按鈕。
  text-decoration: none;

  @include focus-ring;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--small {
    padding: spacing('3xs') spacing('xs');
    font-size: font-size('2xs');
  }

  &--medium {
    padding: spacing('xs') spacing('sm');
    font-size: font-size('sm');
  }

  &--large {
    padding: spacing('sm') spacing('md');
    font-size: font-size('md');
  }

  &--block {
    display: flex;
    width: 100%;
  }

  // 只放圖示時左右不需要留給文字的空間，收成正方形才不會看起來歪歪的。
  // 它與 size 相乘，所以大小仍然由使用端決定。
  &--labelled {
    aspect-ratio: 1;
    padding: spacing('xs');
  }

  // 對話介面的兩種外形。圓形與「只放圖示」相乘才是一個正圓：
  // 前者給圓角、後者給等寬高，兩個都要。
  &--pill {
    border-radius: radius('pill');
  }

  &--circle {
    aspect-ratio: 1;
    border-radius: radius('pill');
  }

  // 大圓角的方塊。它不與 `--labelled` 相乘拿等寬高，因為用它的地方
  // 自己說得出要多大（那個數字同時被別的規則讀著）。
  &--squircle {
    border-radius: radius('2xl');
  }

  // 整個畫面上最想被按的那一顆。
  //
  // 它與 `primary` 的差別不是「更藍一點」，是**它不待在版面裡**：
  // 用它的東西浮在所有內容之上，所以它要自己與背後那一整片分開——
  // 那一圈光就是在做這件事，而一塊平的實心色塊在深色底上做不到。
  //
  // 因此它一個版面上只該有一顆：兩圈光互相搶，等於沒有光。
  &--accent {
    box-shadow: shadow('glow');
    background-image: linear-gradient(145deg, color('primary-strong'), color('primary'));
    color: color('text-inverse');

    &:hover:not(:disabled) {
      box-shadow: shadow('glow-strong');
    }
  }

  // 實心的強調色只留給「這個畫面上要按的那一顆」。
  // 一個版面上有兩顆亮藍色按鈕，等於沒有主要動作。
  &--primary {
    background-color: color('primary');
    color: color('text-inverse');

    &:hover:not(:disabled) {
      background-color: color('primary-strong');
    }
  }

  // 儀器上的按鍵：一圈髮絲線加一塊比面板略暗的鍵面，按下去才亮起來。
  &--secondary {
    border-color: color('border-strong');
    background-color: color('surface-muted');
    color: color('text');

    &:hover:not(:disabled) {
      border-color: color('text-faint');
      color: color('text-strong');
    }
  }

  // 幽靈按鈕在這裡是中性的，不是強調色的淡版——
  // 它們成排出現（區間、畫法、清單），一整排藍字會把版面吵翻。
  &--ghost {
    background-color: transparent;
    color: color('text-muted');

    &:hover:not(:disabled) {
      background-color: color('surface-muted');
      color: color('text-strong');
    }
  }

  &--danger {
    background-color: color('danger');
    color: color('text-inverse');

    &:hover:not(:disabled) {
      background-color: color('danger-soft');
      color: color('danger');
    }
  }

  // 會弄丟東西、但不是這個畫面主角的動作。
  //
  // 實心紅是給「這一頁就是為了刪掉它而存在」的地方用的；擺在一個主要動作旁邊，
  // 兩顆一樣搶眼，眼睛第一個看到的反而是那顆會弄丟東西的。這一種安靜地待著，
  // 只在滑過去時才紅起來——夠讓人在按之前知道自己在碰什麼。
  &--danger-ghost {
    background-color: transparent;
    color: color('text-muted');

    &:hover:not(:disabled) {
      background-color: color('danger-soft');
      color: color('danger');
    }
  }
}
</style>
