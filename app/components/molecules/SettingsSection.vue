<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'

// 分子：設定畫面上的一個段落——一張卡，標題列在最上面，可以動的東西在下面。
//
// 標題列右邊留一個位置給「這一段現在的狀態」（例如 Telegram 已設定），
// 一眼就讀得到，不必往下找。說明跟著標題走，不佔用第一格欄位的位置。
//
// 它只出插槽與骨架，不認識任何領域概念。
defineProps<{
  title: string
  /** 一句話說明這個段落在做什麼。 */
  description?: string
}>()
</script>

<template>
  <AppPanel
    class="settings-section"
    flush
  >
    <header class="settings-section__head">
      <div class="settings-section__heading">
        <h2 class="settings-section__title">
          {{ title }}
        </h2>
        <p
          v-if="description"
          class="settings-section__description"
        >
          {{ description }}
        </p>
      </div>

      <div
        v-if="$slots.status"
        class="settings-section__status"
      >
        <slot name="status" />
      </div>
    </header>

    <div class="settings-section__controls">
      <slot />
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.settings-section {
  &__head {
    display: flex;
    gap: spacing('xs');
    align-items: flex-start;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    padding: spacing('sm');

    @include respond-to('md') {
      padding: spacing('sm') spacing('md');
    }
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    line-height: line-height('tight');
    font-weight: font-weight('semibold');
    font-size: font-size('md');
  }

  &__description {
    margin: 0;
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('xs');
  }

  &__status {
    display: flex;
    flex: none;
    gap: spacing('2xs');
    align-items: center;
  }

  // 可操作的東西填滿整張卡，寬度上限由卡片本身決定（見 pages/settings）。
  &__controls {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    padding: spacing('sm');
    min-width: 0;

    @include respond-to('md') {
      padding: spacing('md');
    }
  }
}
</style>
