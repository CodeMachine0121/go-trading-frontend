<script setup lang="ts">
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
watch(() => open, (isOpen) => {
  if (import.meta.server) {
    return
  }

  if (isOpen) {
    document.addEventListener('keydown', closeOnEscape)
  }
  else {
    document.removeEventListener('keydown', closeOnEscape)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    document.removeEventListener('keydown', closeOnEscape)
  }
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
      <header class="app-modal__header">
        <h2 class="app-modal__title">
          {{ title }}
        </h2>
        <button
          class="app-modal__close"
          type="button"
          aria-label="關閉"
          @click="emit('close')"
        >
          ×
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
  padding: spacing('md');

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: color('backdrop');
  }

  &__panel {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    box-shadow: shadow('md');
    border: 1px solid color('border');
    border-radius: radius('lg');
    background-color: color('surface');
    padding: spacing('lg');
    width: min(40rem, 100%);
    max-height: 100%;
    overflow-y: auto;
  }

  &__header {
    display: flex;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-size: font-size('lg');
    font-weight: font-weight('medium');
  }

  &__close {
    border: none;
    background: none;
    cursor: pointer;
    padding: 0 spacing('2xs');
    color: color('text-muted');
    line-height: line-height('tight');
    font-size: font-size('xl');

    @include focus-ring;

    &:hover {
      color: color('text-strong');
    }
  }

  &__actions {
    display: flex;
    gap: spacing('xs');
    justify-content: flex-end;
  }
}
</style>
