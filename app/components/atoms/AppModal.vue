<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'

// 原子：全站唯一的對話框。疊在畫面上、把注意力收在一件事上——
// 清單、取名、再問一次三處共用它，不各自長出一個。
// 它不認識任何領域概念，內容一律由使用端以插槽給。
const { open, title } = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{ close: [] }>()

// Esc 關掉是對話框的基本禮貌，但它是全域鍵盤事件——只在開著的時候聽，
// 否則三個對話框會同時搶同一個按鍵。
//
// 這兩段都不必防伺服器端：watcher 只在 props 變動時跑、onBeforeUnmount 只在拆掉時跑，
// 而伺服器端只渲染一次，兩件事都不會發生。
watch(() => open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', closeOnEscape)
  }
  else {
    document.removeEventListener('keydown', closeOnEscape)
  }
})

// 沒有這一段的話，開著的時候被拆掉就會留下一個對著已消失元件喊話的監聽器。
onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEscape)
})

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<template>
  <div
    v-if="open"
    class="app-modal"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- 點在對話框以外的地方等同關閉，這是使用者對「疊上來的東西」既有的預期。 -->
    <div
      class="app-modal__backdrop"
      @click="emit('close')"
    />

    <div class="app-modal__panel">
      <!-- 對話框的頭尾與面板的頭尾是同一條窄帶：疊上來的東西也是這個操作台的一部分。 -->
      <header class="app-modal__header">
        <h2 class="app-modal__title">
          {{ title }}
        </h2>
        <button
          class="app-modal__close"
          type="button"
          aria-label="關閉"
          title="關閉"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>
      </header>

      <div class="app-modal__body">
        <slot />
      </div>

      <footer
        v-if="$slots.actions"
        class="app-modal__actions"
      >
        <slot name="actions" />
      </footer>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-modal {
  position: fixed;
  z-index: z-index('modal');
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: spacing('lg');

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: color('backdrop');
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    box-shadow: shadow('lg');
    border: 1px solid color('border-strong');
    border-radius: radius('lg');

    // 疊在面板之上的東西比面板亮一階——深色介面的「浮起來」是這樣講的。
    background-color: color('surface-overlay');
    width: min(38rem, 100%);
    max-height: 100%;
    overflow: hidden;
  }

  &__header {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('2xs') spacing('2xs') spacing('sm');
    min-height: 2.25rem;
  }

  &__title {
    margin: 0;
    font-size: font-size('sm');

    @include dense-label;
  }

  &__close {
    display: inline-flex;
    flex: none;
    border: none;
    border-radius: radius('sm');
    background: none;
    cursor: pointer;
    padding: spacing('3xs');
    color: color('text-faint');

    @include focus-ring;

    &:hover {
      background-color: color('surface');
      color: color('text-strong');
    }
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: spacing('md');
    min-height: 0;
    padding: spacing('md');
    overflow-y: auto;
  }

  &__actions {
    display: flex;
    flex: none;
    gap: spacing('xs');
    justify-content: flex-end;
    border-top: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('xs') spacing('sm');
  }
}
</style>
