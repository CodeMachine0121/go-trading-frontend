<script setup lang="ts">
// 樣板：全站共用的版面骨架，只有結構與插槽，不綁任何資料。
defineProps<{ title: string }>()
</script>

<template>
  <div class="console-layout">
    <header class="console-layout__header">
      <p class="console-layout__brand">
        go-trading
      </p>
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
          to="/indicator-calculations"
          class="console-layout__link"
        >
          指標計算
        </NuxtLink>
      </nav>
    </header>

    <main class="console-layout__main">
      <h1 class="console-layout__title">
        {{ title }}
      </h1>
      <slot />
    </main>
  </div>
</template>

<style scoped lang="scss">
.console-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;

  &__header {
    display: flex;
    gap: spacing('lg');
    align-items: center;
    border-bottom: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('sm') spacing('lg');
  }

  &__brand {
    margin: 0;
    font-weight: font-weight('bold');
  }

  &__nav {
    display: flex;
    gap: spacing('md');
  }

  &__link {
    color: color('text-muted');
    font-size: font-size('sm');
    text-decoration: none;

    &:hover {
      color: color('primary');
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: spacing('lg');
    margin: 0 auto;
    padding: spacing('xl') spacing('lg');
    width: 100%;
    max-width: 1200px;
  }

  &__title {
    margin: 0;
  }
}
</style>
