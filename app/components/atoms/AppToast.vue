<script setup lang="ts">
// 原子：做完一件事之後飄出來的那一句，過幾秒自己消失。
//
// 它跟 AppAlert 是兩件事，所以是兩個元件：AppAlert 說的是**現在這裡的狀態**，
// 待在它說明的那塊旁邊，看完為止；這一句說的是**剛剛那個動作的結果**，
// 動作做完時原地已經沒有東西可以貼——對話框關掉了，清單重畫了——
// 所以它浮在畫面上，並且會自己走。
//
// 「幾秒後消失」不在這裡算。一個元件自己開計時器，等於同一句話重複送來時
// 有兩個計時器在數，先到的那個會把後來的話收掉。何時收由送話的那一邊決定，
// 這裡只負責把它畫出來。
type ToastTone = 'success' | 'danger'

const { message, tone = 'success' } = defineProps<{
  /** 空字串就是現在沒有話要說。 */
  message: string
  tone?: ToastTone
}>()
</script>

<template>
  <Transition name="app-toast">
    <!--
      role="status" 搭配 aria-live="polite"：讀螢幕的人也要知道剛剛那件事成了，
      而且是等他把手邊那句話讀完再說，不是打斷他。
    -->
    <div
      v-if="message !== ''"
      class="app-toast"
      :class="`app-toast--${tone}`"
      role="status"
      aria-live="polite"
      data-testid="app-toast"
    >
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.app-toast {
  position: fixed;

  // 右下角：那裡沒有任何控制項，所以這一句不會蓋住使用者下一個要按的東西。
  right: spacing('md');
  bottom: spacing('md');
  z-index: z-index('toast');
  border: 1px solid color('border');
  border-left-width: 2px;
  border-radius: radius('sm');
  box-shadow: shadow('md');
  padding: spacing('xs') spacing('sm');
  max-width: min(360px, calc(100vw - #{spacing('md')} * 2));
  font-size: font-size('xs');
  line-height: line-height('normal');

  &--success {
    border-color: color('success-soft');
    border-left-color: color('success');
    background-color: color('success-soft');
    color: color('success');
  }

  &--danger {
    border-color: color('danger-soft');
    border-left-color: color('danger');
    background-color: color('danger-soft');
    color: color('danger');
  }
}

// 直接出現在眼角餘光裡的東西看起來像閃一下，滑進來才看得出它是新的一句。
.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity duration('fast') ease, transform duration('fast') ease;
}

.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translateY(spacing('xs'));
}

// 關掉動畫的人只要這句話出現與消失，不要它滑。
@media (prefers-reduced-motion: reduce) {
  .app-toast-enter-active,
  .app-toast-leave-active {
    transition: none;
  }
}
</style>
