<script setup lang="ts">
// 分子：設定畫面上的一個段落——左邊說「這是什麼」，右邊放「可以動的東西」。
//
// 這個版型解掉設定畫面最容易犯的三個毛病，而且是同一招解的：
//
//   一、**寬度**。整頁一欄的話，一個密碼框會被拉到九百多像素寬——沒有任何一個
//       密碼需要那麼寬。左右分欄之後，可操作的那一欄天然被限制在一個手臂寬。
//   二、**層級**。段落標題是真的標題（亮、夠大），不是一條暗到看不見的窄帶。
//       說明文字跟著標題走，不是塞在表單第一行擋路。
//   三、**右半邊的空白**。1440 的螢幕上，一欄式版面會留下一大片死掉的右側；
//       兩欄把它用掉了。
//
// 它只出插槽與骨架，不認識任何領域概念——四個段落（帳號、換密碼、Telegram、試送）
// 用的都是這一個。
defineProps<{
  title: string
  /** 一句話說明這個段落在做什麼。它住在標題旁邊，不佔用可操作那一欄的第一行。 */
  description?: string
}>()
</script>

<template>
  <section class="settings-section">
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
  </section>
</template>

<style scoped lang="scss">
.settings-section {
  display: grid;
  gap: spacing('sm');
  padding: spacing('lg');

  // 段落之間只用一條髮絲線分開，不各自畫一個框。四個框疊起來會讀成四個彼此無關的
  // 東西，而它們其實是同一頁的四段。
  //
  // 相鄰選擇器跨得過元件邊界：這幾個段落在 DOM 上是兄弟。
  & + & {
    border-top: 1px solid color('border');
  }

  @include respond-to('md') {
    grid-template-columns: minmax(0, 13rem) minmax(0, 1fr);
    gap: spacing('xl');
    padding: spacing('xl');
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
    font-size: font-size('md');
  }

  &__description {
    margin: 0;
    color: color('text-faint');
    line-height: line-height('normal');
    font-size: font-size('2xs');
  }

  &__controls {
    display: flex;
    flex-direction: column;
    gap: spacing('md');
    min-width: 0;

    // 可操作的那一欄有上限，而且**四個段落共用同一個上限**。
    //
    // 沒有上限的話，欄位會跟著視窗一起變寬，而一個變寬的輸入框並不會變好填。
    // 各段自己訂寬度的話，四段會切出四條右緣——一頁上四條參差的邊，
    // 看起來就是沒對齊，即使每一段自己都對得好好的。
    max-width: 28rem;
  }
}
</style>
