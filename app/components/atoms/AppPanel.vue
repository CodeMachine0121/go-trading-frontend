<script setup lang="ts">
// 原子：一塊面板的外框。
//
// 這個操作台上的每一個區域——查詢條件、結果表格、圖、編輯器、執行條件——
// 都是「一條標題列 + 一塊內容」。以前每個有機體各自畫一份那條框線與那個標題，
// 於是同一件事有五種寫法：有的有標題列有的沒有、內距各差一級、圓角各自為政。
// 收成一個原子之後，「面板長什麼樣」只有一個答案，而且它是儀器面板的答案：
// 標題列是一條有底色的窄帶，標題本身小而暗，版面的亮度全部留給裡面的資料。
//
// 它不認識任何領域概念：標題是一個字串，其餘一切走插槽。
const { title = null, flush = false } = defineProps<{
  title?: string | null
  /**
   * 內容自己貼齊四邊，面板不留內距。
   *
   * 表格、圖與編輯器都是「自己就是一整塊」的東西——它們的邊界就該是面板的邊界。
   * 讓面板再包一層內距，看起來像把一張紙墊在框裡，而不是一個嵌在儀器上的螢幕。
   */
  flush?: boolean
}>()
</script>

<template>
  <section class="app-panel">
    <header
      v-if="title !== null || $slots.meta || $slots.actions"
      class="app-panel__bar"
    >
      <div class="app-panel__identity">
        <h2
          v-if="title !== null"
          class="app-panel__title"
        >
          {{ title }}
        </h2>
        <div
          v-if="$slots.meta"
          class="app-panel__meta"
        >
          <slot name="meta" />
        </div>
      </div>

      <div
        v-if="$slots.actions"
        class="app-panel__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <div
      class="app-panel__body"
      :class="{ 'app-panel__body--flush': flush }"
    >
      <slot />
    </div>

    <footer
      v-if="$slots.footer"
      class="app-panel__footer"
    >
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped lang="scss">
.app-panel {
  display: flex;
  flex-direction: column;

  // 面板要能被塞進一個固定高度的格子裡（圖、編輯器），
  // 而 flex 子項預設不肯縮到比內容小——沒有這一行，裡面的表格會把整個工作區頂長。
  min-height: 0;
  border: 1px solid color('border');
  border-radius: radius('md');
  background-color: color('surface');
  overflow: hidden;

  &__bar {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('sm');

    // 標題列要窄，但裡面塞得下一顆 small 按鈕而不會忽高忽低。
    min-height: 2.25rem;
  }

  &__identity {
    display: flex;
    gap: spacing('sm');
    align-items: baseline;
    min-width: 0;
  }

  &__title {
    margin: 0;

    @include dense-label;
  }

  &__meta {
    display: flex;
    gap: spacing('xs');
    align-items: baseline;
    overflow: hidden;
    color: color('text-muted');
    font-size: font-size('2xs');
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__actions {
    display: flex;
    flex: none;
    gap: spacing('2xs');
    align-items: center;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: spacing('md');
    min-height: 0;
    padding: spacing('md');

    &--flush {
      gap: 0;
      padding: 0;
    }
  }

  &__footer {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('sm');
    color: color('text-muted');
    font-size: font-size('2xs');
  }
}
</style>
