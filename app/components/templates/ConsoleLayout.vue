<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import { useLayoutDensity } from '~/composables/use-layout-density'

// 樣板：全站共用的版面骨架，只有結構與插槽，不綁任何資料。
//
// **兩種外框，同一份去處。**
//
// 寬螢幕是交易終端機的樣子：導覽收在左邊一條固定的側欄，頂上一條窄帶說「我在哪一個
// 畫面」，剩下的整片都是工作區。工作區永遠填滿視窗——表格與圖在自己的框裡捲，
// 不是整頁一起捲。
//
// 窄螢幕是一台 app 的樣子：**去處貼在畫面底部**，常用的四個直接露出來，其餘收進
// 「更多」。這不是把側欄縮小，是換一種東西：
//
// - 去處**永遠看得見**。藏在一顆鍵後面的清單，每次換畫面都是兩下（開、選），
//   而且使用者不按下去就不知道自己還能去哪裡。
// - 拇指**構得到**。畫面最上緣是單手握著時最遠的地方，而導覽是全站按最多次的東西。
// - 它是這一類 app 的既有慣例：交易 app 幾乎一律如此（TradingView、Yahoo Finance、
//   Bloomberg、Fidelity、Stake、Wealthsimple 都是底部一排分頁），使用者不必重新學。
//
// 頂上那條窄帶在窄螢幕上也換了角色：它不再是一條有底色的帶子，而是**內容裡的一行
// 大字**。一條永遠佔著高度的窄帶，在手機上換來的只是少掉一行內容。
const DESTINATIONS = [
  { to: '/', label: '連線狀態', icon: 'connection', primary: false },
  { to: '/k-candles', label: 'K 線瀏覽', icon: 'table', primary: false },
  { to: '/k-candles/chart', label: 'K 線圖表', icon: 'candles', primary: true },
  { to: '/watchlist', label: '觀察清單', icon: 'table', primary: true },
  { to: '/indicator-calculations', label: '指標計算', icon: 'formula', primary: false },
  { to: '/marketplace', label: '策略腳本市集', icon: 'library', primary: false },
  // 機器人排在市集之後、助手之前：市集是「有什麼可以用」，這裡是「我派了誰出去」，
  // 兩者是同一件事的前後兩步。
  { to: '/strategy-bots', label: '策略機器人', icon: 'standing-bot', primary: true },
  { to: '/chat', label: '行情助手', icon: 'robot', primary: true },
  { to: '/settings', label: '設定', icon: 'settings', primary: false },
] as const

/**
 * 底部那一排放哪幾個。
 *
 * 四個，不是九個：一排超過五格之後，每一格就窄到放不下一個讀得出來的名字，
 * 而沒有名字的圖示等於要使用者猜。挑的是**看的次數**最多的那四個——
 * 圖、清單、我派出去的機器人、隨口問一句——其餘的走「更多」。
 */
const PRIMARY_DESTINATIONS = DESTINATIONS.filter(destination => destination.primary)
const SECONDARY_DESTINATIONS = DESTINATIONS.filter(destination => !destination.primary)

defineProps<{
  title: string
  subtitle?: string
}>()

const { layoutDensity } = useLayoutDensity()
const route = useRoute()

/**
 * 側欄收起來了沒有。
 *
 * **收起來的是那幾個字，不是那幾個地方**：側欄縮成一條只剩圖示的窄邊，
 * 九個畫面照樣按得到。整條藏起來會逼使用者為了回去而先展開，
 * 而他多數時候只是想讓圖寬一點。
 *
 * 它是跨畫面共用的狀態（`useState`）而不是這個元件裡的一個 `ref`：
 * 每換一個畫面，樣板就重新掛載一次，而使用者收起來的側欄不該在他走到下一頁時彈回來。
 */
const railStowed = useState('console-rail-stowed', () => false)

/** 「更多」那張紙開著沒有。它是當下的動作，換了畫面就結束，所以不跨畫面共用。 */
const moreOpen = ref(false)

/**
 * 現在待的這個畫面藏在「更多」裡。
 *
 * 那時候底下四格沒有一格是亮的，而一排全暗的分頁讀起來像「我不在任何地方」。
 * 把「更多」點亮，那一排才說得出使用者現在在哪裡。
 */
const insideMore = computed(
  () => SECONDARY_DESTINATIONS.some(destination => destination.to === route.path))

// 走到別的畫面就把那張紙收起來——它的任務在使用者挑完那一刻就結束了。
watch(() => route.fullPath, () => {
  moreOpen.value = false
})

/**
 * 視窗變寬到不再需要底部那一排時，把那張紙也收掉。
 *
 * 不收的話那個「開著」會留在狀態裡：使用者把視窗拉寬、再拉窄回來，
 * 紙就自己跳出來，而他沒有按過任何東西。
 */
watch(() => layoutDensity.value.usesBottomNavigation, (usesBottomNavigation) => {
  if (!usesBottomNavigation) {
    moreOpen.value = false
  }
})
</script>

<template>
  <div
    class="console-layout"
    :class="{
      'console-layout--stowed': railStowed,
      'console-layout--bottom-navigation': layoutDensity.usesBottomNavigation,
    }"
  >
    <nav
      v-if="!layoutDensity.usesBottomNavigation"
      class="console-layout__rail"
      aria-label="操作台"
    >
      <div class="console-layout__brand">
        <span class="console-layout__brand-mark" />
        <span class="console-layout__brand-name">go-trading</span>

        <!--
          收起來那顆鍵釘在標記旁邊：收起來之後那裡只剩一個點，
          而使用者要把側欄拿回來，就得知道去哪裡按——那個位置不能跟著字一起消失。
        -->
        <AppButton
          variant="ghost"
          size="small"
          class="console-layout__stow"
          :label="railStowed ? '展開側欄' : '收起側欄'"
          data-testid="toggle-rail"
          @click="railStowed = !railStowed"
        >
          <AppIcon
            name="chevron"
            size="small"
            class="console-layout__stow-chevron"
          />
        </AppButton>
      </div>

      <ul class="console-layout__destinations">
        <li
          v-for="destination in DESTINATIONS"
          :key="destination.to"
        >
          <!--
            收起來時名字仍然在 DOM 裡，只是看不見：拿掉它，讀螢幕的人聽到的
            就是九條沒有名字的連結；停在上面的人則靠 title 讀出它是哪一個。
          -->
          <NuxtLink
            :to="destination.to"
            class="console-layout__link"
            :title="destination.label"
          >
            <AppIcon
              :name="destination.icon"
              size="small"
            />
            <span class="console-layout__link-label">{{ destination.label }}</span>
          </NuxtLink>
        </li>
      </ul>

      <!-- 那顆燈由頁面填進來：樣板只出骨架與位置，不認識任何資料 -->
      <div class="console-layout__status">
        <slot name="status" />
      </div>

      <!--
        現在是誰在用，同樣由頁面填進來。它釘在那顆燈下面：
        「線路狀態」與「是誰在線上」是同一類東西，都屬於這條側欄的底部。
      -->
      <div class="console-layout__account">
        <slot name="account" />
      </div>
    </nav>

    <div class="console-layout__frame">
      <!--
        三樣東西擺成一個格子，而不是一個「標題組」加一個「控制項組」：
        窄螢幕上標題與那顆控制項並排、副標自己整行；寬螢幕上三樣同一行。
        包成兩組的話，副標會被綁在標題旁邊那一欄裡，而那一欄在 390 的螢幕上
        扣掉時區選單只剩不到三分之一——一句四十個字的說明會被擠成一行六個字。
      -->
      <header class="console-layout__strip">
        <h1 class="console-layout__title">
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="console-layout__subtitle"
        >
          {{ subtitle }}
        </p>

        <!-- 時區選單由頁面填進來：樣板只出骨架與位置，不認識任何資料 -->
        <div class="console-layout__context">
          <slot name="timezone" />
        </div>
      </header>

      <main class="console-layout__workspace">
        <slot />
      </main>
    </div>

    <!--
      窄螢幕上的導覽。它是版面的一格（不是浮在內容上），所以內容永遠不會被它蓋住，
      也不需要任何層級——這一點與一片疊上來的抽屜正好相反。
    -->
    <nav
      v-if="layoutDensity.usesBottomNavigation"
      class="console-layout__tabs"
      aria-label="操作台"
    >
      <NuxtLink
        v-for="destination in PRIMARY_DESTINATIONS"
        :key="destination.to"
        :to="destination.to"
        class="console-layout__tab"
        :data-testid="`tab-${destination.to}`"
      >
        <AppIcon :name="destination.icon" />
        <span class="console-layout__tab-label">{{ destination.label }}</span>
      </NuxtLink>

      <button
        type="button"
        class="console-layout__tab"
        :class="{ 'console-layout__tab--current': insideMore }"
        :aria-expanded="moreOpen"
        data-testid="tab-more"
        @click="moreOpen = true"
      >
        <AppIcon name="menu" />
        <span class="console-layout__tab-label">更多</span>
      </button>
    </nav>

    <!--
      其餘的去處，加上那顆燈與現在是誰在用——側欄底部那兩樣在窄螢幕上沒有側欄可待，
      而它們說的是「這條線路現在怎麼了」，與「我還能去哪裡」屬於同一個問題。
    -->
    <AppModal
      v-if="layoutDensity.usesBottomNavigation"
      :open="moreOpen"
      title="更多"
      @close="moreOpen = false"
    >
      <ul class="console-layout__more-list">
        <li
          v-for="destination in SECONDARY_DESTINATIONS"
          :key="destination.to"
        >
          <NuxtLink
            :to="destination.to"
            class="console-layout__more-link"
            :data-testid="`more-${destination.to}`"
          >
            <AppIcon
              :name="destination.icon"
              size="small"
            />
            <span class="console-layout__more-label">{{ destination.label }}</span>
            <AppIcon
              name="chevron"
              size="small"
              class="console-layout__more-chevron"
            />
          </NuxtLink>
        </li>
      </ul>

      <div class="console-layout__more-footer">
        <slot name="status" />
        <slot name="account" />
      </div>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
.console-layout {
  display: grid;

  // 窄螢幕：工作區一格，底下那一排分頁一格。分頁是版面的一部分而不是浮在上面，
  // 所以內容不會有一截藏在它底下，也不必替它保留內距。
  grid-template-rows: minmax(0, 1fr) auto;
  height: 100%;

  @include respond-to('lg') {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: 13rem minmax(0, 1fr);
  }

  &--stowed {
    @include respond-to('lg') {
      grid-template-columns: 3rem minmax(0, 1fr);
    }
  }

  // 伺服器端量不到視窗，所以它畫出來的一律是側欄那一版（見 useLayoutDensity）。
  // 在手機上，那一版在補正之前會**真的佔掉版面的第一列**，把整個工作區推到摺線以下。
  // 因此這裡還要再擋一次：程式決定要不要渲染它，樣式決定它在這個寬度看不看得見。
  // 兩道各自獨立——少了樣式這一道，第一眼看到的就是一條九個項目的側欄。
  &__rail {
    display: none;
    flex-direction: column;

    @include respond-to('lg') {
      display: flex;
    }

    gap: spacing('lg');
    border-right: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('md') spacing('sm');
    overflow-y: auto;
  }

  &__brand {
    display: flex;
    flex: none;
    gap: spacing('xs');
    align-items: center;
    padding: 0 spacing('2xs');
  }

  &__stow {
    display: inline-flex;
    margin-left: auto;
    color: color('text-faint');
  }

  // 那個角指著它按下去會往哪裡走：開著時往左（收過去），收著時往右（拉回來）。
  &__stow-chevron {
    transition: transform duration('fast') ease;
    transform: rotate(90deg);
  }

  &--stowed &__stow {
    margin-left: 0;
  }

  &--stowed &__stow-chevron {
    transform: rotate(-90deg);
  }

  &__brand-mark {
    flex: none;
    border-radius: radius('pill');
    background-color: color('primary');
    width: 0.5rem;
    height: 0.5rem;
  }

  &__brand-name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
    font-family: font-family('mono');
    white-space: nowrap;
  }

  // 收起來時那幾個字退到看不見，**但留在 DOM 裡**：拿掉它們，
  // 讀螢幕的人聽到的就是九條沒有名字的連結，而那條側欄等於壞了。
  &--stowed &__brand-name {
    @include visually-hidden;
  }

  // 名字不見了，那顆點就不再是標記而只是一個點——三公分寬的邊上，
  // 它佔的是那顆「把側欄拿回來」的鍵需要的位置。
  &--stowed &__brand-mark {
    display: none;
  }

  &--stowed &__link-label {
    @include visually-hidden;
  }

  // 只剩圖示時，一條左邊留著字距的連結會讓那排圖示歪在一邊。
  &--stowed &__link {
    justify-content: center;
    padding: spacing('xs') 0;
  }

  // 側欄自己也收窄：留著給文字的內距，那條邊就不是三公分而是四公分。
  &--stowed &__rail {
    padding-right: spacing('2xs');
    padding-left: spacing('2xs');
  }

  &--stowed &__brand {
    justify-content: center;
    padding: 0;
  }

  &__destinations {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__link {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    transition: background-color duration('fast') ease, color duration('fast') ease;
    border-radius: radius('sm');
    padding: spacing('xs');
    color: color('text-muted');
    font-size: font-size('sm');
    text-decoration: none;
    white-space: nowrap;

    @include tap-target;

    &:hover {
      background-color: color('surface-muted');
      color: color('text-strong');
    }

    // Nuxt 會在目前這條路由的連結上掛 exact-active，讓「我在哪一頁」看得出來。
    // 除了換底色，左邊還立一條強調色的短邊——一整排文字裡，那條邊比顏色更快被找到。
    &.router-link-exact-active {
      box-shadow: inset 2px 0 0 0 color('primary');
      background-color: color('primary-soft');
      color: color('primary');
    }
  }

  &__status {
    flex: none;
    margin-top: auto;
    border-top: 1px solid color('border');
    padding: spacing('sm') spacing('2xs') 0;
  }

  &__account {
    flex: none;
    padding: spacing('2xs') spacing('2xs') 0;
  }

  // 側欄收起來時那一行電子郵件沒有地方站——三公分寬的邊上，它只會被切成
  // 兩個字。那顆離開仍然在，因為它是一個動作，而動作只需要一個圖示。
  &--stowed &__account {
    padding-right: 0;
    padding-left: 0;
  }

  &__frame {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  // 窄螢幕上這不是一條帶子，是內容的第一行：沒有底色、沒有框線，字大一階。
  // 一條有底色的窄帶會把畫面切成「介面」與「內容」兩塊，而手機上整片都該是內容。
  &__strip {
    display: grid;
    flex: none;

    // 窄螢幕：標題與那顆控制項並排，副標自己一整行。
    //
    // 第二欄給上限而不是讓它跟著內容長：時區選單的字很長（「世界標準時間
    // （UTC+00:00）」），跟著內容長的話它會佔掉三分之二，把一個五個字的標題
    // 擠到換行。這一行的主角是「我在哪一個畫面」，時區是設好就不太動的偏好。
    grid-template-columns: minmax(0, 1fr) minmax(0, 10rem);
    gap: spacing('3xs') spacing('sm');
    align-items: center;
    background-color: color('background');
    padding: spacing('sm') spacing('md') spacing('2xs');

    @include respond-to('lg') {
      grid-template-columns: auto minmax(0, 1fr) auto;
      gap: spacing('md');
      align-items: baseline;
      border-bottom: 1px solid color('border');
      background-color: color('surface');
      padding: spacing('xs') spacing('md');
    }
  }

  &__title {
    flex: none;
    margin: 0;
    font-size: font-size('xl');

    @include respond-to('lg') {
      font-size: font-size('lg');
    }
  }

  // 副標說的是「這個畫面怎麼用」，看過一次就不必再看。窄螢幕上它橫跨整行
  // （那裡本來就是讀字的地方），寬螢幕上與標題同一行，不多佔高度。
  &__subtitle {
    grid-column: 1 / -1;
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');

    @include respond-to('lg') {
      grid-column: 2;
      grid-row: 1;
    }
  }

  &__context {
    display: flex;
    grid-column: 2;
    grid-row: 1;
    gap: spacing('xs');
    align-items: center;
    justify-self: end;
    min-width: 0;

    @include respond-to('lg') {
      grid-column: 3;
    }
  }

  // 工作區是唯一會捲的地方，而且它自己就是整片深色底——面板浮在上面。
  &__workspace {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: spacing('sm');
    min-height: 0;
    background-color: color('background');
    padding: spacing('sm');
    overflow: auto;
  }

  // 底部那一排。每一格是一個等寬的直欄：圖示在上、名字在下，整格都按得到。
  // 同上，反過來：底部那一排在寬螢幕上不該出現，即使有誰把它渲染出來。
  &__tabs {
    display: grid;
    grid-auto-columns: 1fr;
    grid-auto-flow: column;

    @include respond-to('lg') {
      display: none;
    }

    border-top: 1px solid color('border');
    background-color: color('surface');

    // 讓開手機自己的那一條橫條，否則最底下那一排有一半按不到。
    @include safe-area-bottom;
  }

  &__tab {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    align-items: center;
    justify-content: center;
    transition: color duration('fast') ease;
    border: none;
    cursor: pointer;
    background-color: transparent;

    // 一格分頁要放得下一根手指，而且上下都要留出餘地——這是全站按最多次的東西。
    padding: spacing('xs') spacing('3xs');
    min-height: 3.25rem;
    color: color('text-faint');
    text-decoration: none;

    @include focus-ring;

    &.router-link-exact-active,
    &--current {
      color: color('primary');
    }
  }

  &__tab-label {
    font-size: font-size('2xs');
    line-height: line-height('tight');
    white-space: nowrap;
  }

  &__more-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__more-link {
    border-radius: radius('sm');
    padding: spacing('xs') spacing('2xs');
    color: color('text');
    font-size: font-size('md');
    text-decoration: none;

    @include pressable-row;

    &.router-link-exact-active {
      color: color('primary');
    }
  }

  &__more-label {
    flex: 1;
  }

  // 那個角只是說「按下去會走到別的地方」，不該與名字爭。
  &__more-chevron {
    flex: none;
    color: color('text-faint');
  }

  &__more-footer {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    margin-top: spacing('sm');
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }
}
</style>
