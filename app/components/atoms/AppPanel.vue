<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'

// 原子：一塊面板的外框。
//
// 這個操作台上的每一個區域——查詢條件、結果表格、圖、編輯器、執行條件——
// 都是「一條標題列 + 一塊內容」。以前每個有機體各自畫一份那條框線與那個標題，
// 於是同一件事有五種寫法：有的有標題列有的沒有、內距各差一級、圓角各自為政。
// 收成一個原子之後，「面板長什麼樣」只有一個答案，而且它是儀器面板的答案：
// 標題列是一條有底色的窄帶，標題本身小而暗，版面的亮度全部留給裡面的資料。
//
// 它不認識任何領域概念：標題是一個字串，其餘一切走插槽。
const { title = null, flush = false, collapsible = false, initiallyCollapsed = false }
  = defineProps<{
    title?: string | null
    /**
     * 內容自己貼齊四邊，面板不留內距。
     *
     * 表格、圖與編輯器都是「自己就是一整塊」的東西——它們的邊界就該是面板的邊界。
     * 讓面板再包一層內距，看起來像把一張紙墊在框裡，而不是一個嵌在儀器上的螢幕。
     */
    flush?: boolean
    /**
     * 這塊面板收得起來——標題列變成一顆可以按的鍵，按一下把內容收掉只留那條窄帶。
     *
     * 給控制項面板用的：控制項是「調一次、看很久」的東西，
     * 而它旁邊那張圖是這個畫面存在的理由。收起來讓出去的高度，圖會自己吃掉。
     */
    collapsible?: boolean
    /**
     * 一打開這個畫面的時候，它是不是就已經收著的。
     *
     * 給的是**環境的意見**，不是使用者的：窄螢幕上控制項一開始就該收著，
     * 因為那塊高度在手機上是圖唯一能長大的方向。
     *
     * 使用者一旦自己按過那條標題列，這個意見就不再算數——他的手比環境的猜測大。
     */
    initiallyCollapsed?: boolean
  }>()

/**
 * 收起來了沒有。**它住在這裡**：哪一塊面板收著不影響任何其他東西，
 * 一路傳到外面去，只是要求每個用到面板的地方都替它記一個布林。
 *
 * 一塊收不起來的面板上這個值沒有意義，而那件事由樣板那一個 v-if 一處決定——
 * 在這裡再判斷一次，兩處遲早會有一處說不同的話。
 */
const collapsed = ref(initiallyCollapsed)

/**
 * 使用者自己按過了沒有。
 *
 * 環境的意見會晚一步到：伺服器端量不到視窗，所以第一次畫出來的一律是寬螢幕那一版，
 * 到了瀏覽器才知道這是一支手機。那一次補正必須發生，否則手機上永遠是展開的；
 * 但它不能蓋掉使用者在那之前按下的那一下。
 */
const chosenByHand = ref(false)

watch(() => initiallyCollapsed, (shouldStartCollapsed) => {
  if (!chosenByHand.value) {
    collapsed.value = shouldStartCollapsed
  }
})

function toggle() {
  chosenByHand.value = true
  collapsed.value = !collapsed.value
}
</script>

<template>
  <section
    class="app-panel"
    :class="{ 'app-panel--collapsed': collapsible && collapsed }"
  >
    <header
      v-if="title !== null || $slots.meta || $slots.actions"
      class="app-panel__bar"
    >
      <!--
        收得起來的面板，整條標題列就是那顆鍵——要收起來的人不必去瞄準一個小角。
        它是一顆按鈕而不是一個掛了 click 的 div：鍵盤走得到，讀螢幕的人也聽得出它可以按。
      -->
      <component
        :is="collapsible ? 'button' : 'div'"
        class="app-panel__identity"
        :class="{ 'app-panel__identity--collapsible': collapsible }"
        :type="collapsible ? 'button' : undefined"
        :aria-expanded="collapsible ? String(!collapsed) : undefined"
        :data-testid="collapsible ? 'toggle-panel' : undefined"
        @click="collapsible && toggle()"
      >
        <AppIcon
          v-if="collapsible"
          name="chevron"
          size="small"
          class="app-panel__chevron"
        />
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
      </component>

      <div
        v-if="$slots.actions"
        class="app-panel__actions"
      >
        <slot name="actions" />
      </div>
    </header>

    <!--
      收起來時內容整塊不畫，而不是把高度壓成零：留著它，裡面的欄位仍然接得到鍵盤焦點，
      使用者會按著 Tab 掉進一塊他明明已經收起來的東西裡。
    -->
    <div
      v-if="!(collapsible && collapsed)"
      class="app-panel__body"
      :class="{ 'app-panel__body--flush': flush }"
    >
      <slot />
    </div>

    <footer
      v-if="$slots.footer && !(collapsible && collapsed)"
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

  // 標題與右邊那組動作排不下時換行，而不是把標題壓扁。
  // 動作那一組的字不折行（按鈕本來就不折），所以會被壓扁的一定是標題——
  // 而一個一行一個字的標題，比多佔一行還難讀。
  &__bar {
    display: flex;
    flex-wrap: wrap;
    flex: none;
    gap: spacing('2xs') spacing('md');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('2xs') spacing('sm');

    // 標題列要窄，但裡面塞得下一顆 small 按鈕而不會忽高忽低。
    min-height: 2.25rem;
  }

  // 收起來的面板就只剩那條窄帶，所以它不能再分工作區的高度——
  // 讓出去的那一片是給旁邊那張圖的，不是留白。
  &--collapsed {
    flex: none;
  }

  &__identity {
    display: flex;
    gap: spacing('sm');
    align-items: baseline;
    min-width: 0;
  }

  // 整條標題列變成一顆鍵時，它仍然要長得像標題列——不多一圈框、不多一塊底色。
  //
  // 但它終究是一顆鍵，而一條十七像素高的鍵在手機上按不準：標題本身只有那麼高，
  // 所以命中範圍要自己撐出來。撐的是高度不是外觀——那條窄帶看起來一模一樣。
  &__identity--collapsible {
    flex: 1;
    align-items: center;
    cursor: pointer;
    border: 0;
    background: none;
    padding: 0;
    text-align: left;

    @include tap-target;
    @include focus-ring;
  }

  // 一個角轉不轉，就是「這塊東西現在是開的還是收的」——
  // 開著朝下（往下還有東西），收著朝右（推開才有）。
  &__chevron {
    transition: transform duration('fast') ease;
    color: color('text-faint');
  }

  &--collapsed &__chevron {
    transform: rotate(-90deg);
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
