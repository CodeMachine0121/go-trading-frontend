<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'

// 分子：設定畫面上的一個段落——一張卡，標題在最上面，可以動的東西在下面。
//
// 標題**在上面**而不是在左邊。左邊那個版型（標題與說明自成一欄）在只有頁首的網站上
// 很好用，但這個操作台左邊已經有一條導覽了——再長出第二欄靠左的文字，讀起來會是
// 兩條並排的側欄。而且它在段落很高的時候會留下一大片空的左欄。
//
// 標題與說明之間、說明與欄位之間各有一條看得見的節奏，段落因此不必靠框線就分得開；
// 框線只用來把一整段圈起來。
//
// 它只出插槽與骨架，不認識任何領域概念。
defineProps<{
  title: string
  /** 一句話說明這個段落在做什麼。它跟著標題走，不佔用第一格欄位的位置。 */
  description?: string
}>()
</script>

<template>
  <AppPanel
    class="settings-section"
    flush
  >
    <div class="settings-section__body">
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

      <div class="settings-section__controls">
        <slot />
      </div>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.settings-section {
  &__body {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    padding: spacing('lg');
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  // 真的是一個標題：亮、夠大、不加字距。段落名要一眼掃得到，
  // 使用者才有辦法在一頁上找到他要的那一段。
  &__title {
    margin: 0;
    color: color('text-strong');
    line-height: line-height('tight');
    font-weight: font-weight('semibold');
    font-size: font-size('lg');
  }

  &__description {
    margin: 0;
    color: color('text-muted');
    line-height: line-height('normal');
    font-size: font-size('xs');
  }

  // 可操作的東西填滿整張卡，寬度上限由卡片本身決定（見 pages/settings）。
  //
  // 這是「標題在上面」換來的好處：卡片有多寬，欄位就有多寬，沒有一格需要自己
  // 訂一個數字——四個段落因此天然切在同一條右緣上，而卡片裡也不會空出一塊。
  &__controls {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    min-width: 0;
  }
}
</style>
