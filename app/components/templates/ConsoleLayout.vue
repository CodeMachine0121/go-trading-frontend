<script setup lang="ts">
// 樣板：全站共用的版面骨架，只有結構與插槽，不綁任何資料。
// 四個畫面共用同一條頂欄與同一個標題區，走到哪裡都認得出自己在同一個操作台裡。
defineProps<{
  title: string
  subtitle?: string
  /** 版面要多寬。編輯器那種需要攤開的畫面用 wide，讀表格的用預設。 */
  width?: 'default' | 'wide'
}>()
</script>

<template>
  <div class="console-layout">
    <header class="console-layout__bar">
      <div class="console-layout__brand">
        <span class="console-layout__brand-mark" />
        <span class="console-layout__brand-name">go-trading</span>
        <span class="console-layout__brand-role">console</span>
      </div>

      <nav class="console-layout__nav">
        <NuxtLink
          to="/"
          class="console-layout__link"
        >
          連線狀態
        </NuxtLink>
        <NuxtLink
          to="/k-candles"
          class="console-layout__link"
        >
          K 線瀏覽
        </NuxtLink>
        <NuxtLink
          to="/k-candles/chart"
          class="console-layout__link"
        >
          K 線圖表
        </NuxtLink>
        <NuxtLink
          to="/indicator-calculations"
          class="console-layout__link"
        >
          指標計算
        </NuxtLink>
      </nav>

      <p class="console-layout__timezone">
        UTC
      </p>
    </header>

    <main
      class="console-layout__main"
      :class="{ 'console-layout__main--wide': width === 'wide' }"
    >
      <div class="console-layout__heading">
        <h1 class="console-layout__title">
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="console-layout__subtitle"
        >
          {{ subtitle }}
        </p>
      </div>

      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.console-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__bar {
    display: flex;
    position: sticky;
    top: 0;
    z-index: 10;
    gap: spacing('xl');
    align-items: center;
    border-bottom: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('sm') spacing('lg');
  }

  &__brand {
    display: flex;
    gap: spacing('xs');
    align-items: baseline;
  }

  &__brand-mark {
    align-self: center;
    border-radius: radius('pill');
    background-color: color('primary');
    width: 0.5rem;
    height: 0.5rem;
  }

  &__brand-name {
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-family: font-family('mono');
  }

  &__brand-role {
    color: color('text-muted');
    font-size: font-size('xs');
    font-family: font-family('mono');
  }

  &__nav {
    display: flex;
    gap: spacing('2xs');
  }

  &__link {
    border-radius: radius('sm');
    padding: spacing('2xs') spacing('sm');
    color: color('text-muted');
    font-size: font-size('sm');
    text-decoration: none;

    &:hover {
      background-color: color('surface-muted');
      color: color('text');
    }

    // Nuxt 會在目前這條路由的連結上掛 exact-active，讓「我在哪一頁」看得出來
    &.router-link-exact-active {
      background-color: color('primary-soft');
      color: color('primary');
    }
  }

  &__timezone {
    margin-left: auto;
    border: 1px solid color('border');
    border-radius: radius('sm');
    padding: 0 spacing('2xs');
    color: color('text-muted');
    font-size: font-size('xs');
    font-family: font-family('mono');
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: spacing('lg');
    margin: 0 auto;
    padding: spacing('xl') spacing('lg');
    width: 100%;
    max-width: 1200px;

    &--wide {
      max-width: 1600px;
    }
  }

  &__heading {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
  }

  &__title {
    margin: 0;
  }

  &__subtitle {
    margin: 0;
    max-width: 70ch;
    color: color('text-muted');
    font-size: font-size('sm');
  }
}
</style>
