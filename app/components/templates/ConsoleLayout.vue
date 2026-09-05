<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppButton from '~/components/atoms/AppButton.vue'

// 樣板：全站共用的版面骨架，只有結構與插槽，不綁任何資料。
//
// 這一版把版面從「置中的一欄文件」換成交易終端機的外框：
// 導覽收進左邊一條固定的側欄，頂上留一條窄帶說「我在哪一個畫面」，
// 剩下的整片都是工作區。四個畫面走到哪裡，外框都在同一個位置，
// 而且工作區永遠填滿視窗——表格與圖在自己的框裡捲，不是整頁一起捲。
//
// 導覽是骨架的一部分（「這個操作台有哪幾個地方可去」），不是資料；
// 需要即時去問後端的東西（那顆燈、時區）一律由頁面填進插槽。
const DESTINATIONS = [
  { to: '/', label: '連線狀態', icon: 'connection' },
  { to: '/k-candles', label: 'K 線瀏覽', icon: 'table' },
  { to: '/k-candles/chart', label: 'K 線圖表', icon: 'candles' },
  { to: '/indicator-calculations', label: '指標計算', icon: 'formula' },
  { to: '/chat', label: '行情助手', icon: 'robot' },
] as const

defineProps<{
  title: string
  subtitle?: string
}>()

/**
 * 側欄收起來了沒有。
 *
 * **收起來的是那幾個字，不是那幾個地方**：側欄縮成一條只剩圖示的窄邊，
 * 五個畫面照樣按得到。整條藏起來會逼使用者為了回去而先展開，
 * 而他多數時候只是想讓圖寬一點。
 *
 * 它是跨畫面共用的狀態（`useState`）而不是這個元件裡的一個 `ref`：
 * 每換一個畫面，樣板就重新掛載一次，而使用者收起來的側欄不該在他走到下一頁時彈回來。
 */
const railStowed = useState('console-rail-stowed', () => false)
</script>

<template>
  <div
    class="console-layout"
    :class="{ 'console-layout--stowed': railStowed }"
  >
    <nav
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
            就是五條沒有名字的連結；停在上面的人則靠 title 讀出它是哪一個。
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
      <header class="console-layout__strip">
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

        <!-- 時區選單由頁面填進來：樣板只出骨架與位置，不認識任何資料 -->
        <div class="console-layout__context">
          <slot name="timezone" />
        </div>
      </header>

      <main class="console-layout__workspace">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.console-layout {
  display: grid;

  // 窄螢幕：側欄躺平成頂上一條，工作區接在下面。
  grid-template-rows: auto minmax(0, 1fr);
  height: 100%;

  @include respond-to('lg') {
    grid-template-rows: minmax(0, 1fr);
    grid-template-columns: 13rem minmax(0, 1fr);
  }

  // 收起來只在側欄真的是一條側欄時才成立。窄螢幕上它躺平成頂上一條，
  // 那時候收起來的是「一條窄帶的高度」——省不到什麼，卻讓五個畫面變得難按。
  &--stowed {
    @include respond-to('lg') {
      grid-template-columns: 3rem minmax(0, 1fr);
    }
  }

  &__rail {
    display: flex;
    gap: spacing('md');
    align-items: center;
    border-bottom: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('xs') spacing('sm');
    overflow-x: auto;

    @include respond-to('lg') {
      flex-direction: column;
      gap: spacing('lg');
      align-items: stretch;
      border-right: 1px solid color('border');
      border-bottom: none;
      padding: spacing('md') spacing('sm');
      overflow-x: visible;
    }
  }

  &__brand {
    display: flex;
    flex: none;
    gap: spacing('xs');
    align-items: center;
    padding: 0 spacing('2xs');
  }

  // 收起來那顆鍵只在側欄真的是一條側欄時才畫得出來——見上面 --stowed 的理由。
  &__stow {
    display: none;

    @include respond-to('lg') {
      display: inline-flex;
      margin-left: auto;
      color: color('text-faint');
    }
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
  // 讀螢幕的人聽到的就是五條沒有名字的連結，而那條側欄等於壞了。
  &--stowed &__brand-name {
    @include respond-to('lg') {
      @include visually-hidden;
    }
  }

  // 名字不見了，那顆點就不再是標記而只是一個點——三公分寬的邊上，
  // 它佔的是那顆「把側欄拿回來」的鍵需要的位置。
  &--stowed &__brand-mark {
    @include respond-to('lg') {
      display: none;
    }
  }

  &--stowed &__link-label {
    @include respond-to('lg') {
      @include visually-hidden;
    }
  }

  // 只剩圖示時，一條左邊留著字距的連結會讓那排圖示歪在一邊。
  &--stowed &__link {
    @include respond-to('lg') {
      justify-content: center;
      padding: spacing('xs') 0;
    }
  }

  // 側欄自己也收窄：留著給文字的內距，那條邊就不是三公分而是四公分。
  &--stowed &__rail {
    @include respond-to('lg') {
      padding-right: spacing('2xs');
      padding-left: spacing('2xs');
    }
  }

  &--stowed &__brand {
    @include respond-to('lg') {
      justify-content: center;
      padding: 0;
    }
  }

  &__destinations {
    display: flex;
    gap: spacing('3xs');
    margin: 0;
    padding: 0;
    list-style: none;

    @include respond-to('lg') {
      flex-direction: column;
    }
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

    @include respond-to('lg') {
      // 燈釘在側欄最底下——那是終端機放「線路狀態」的位置。
      margin-top: auto;
      border-top: 1px solid color('border');
      padding: spacing('sm') spacing('2xs') 0;
    }
  }

  &__account {
    flex: none;

    @include respond-to('lg') {
      padding: spacing('2xs') spacing('2xs') 0;
    }
  }

  // 側欄收起來時那一行電子郵件沒有地方站——三公分寬的邊上，它只會被切成
  // 兩個字。那顆離開仍然在，因為它是一個動作，而動作只需要一個圖示。
  &--stowed &__account {
    @include respond-to('lg') {
      padding-right: 0;
      padding-left: 0;
    }
  }

  &__frame {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  &__strip {
    display: flex;
    flex: none;
    gap: spacing('md');
    align-items: baseline;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('xs') spacing('md');
  }

  &__heading {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs') spacing('sm');
    align-items: baseline;
    min-width: 0;
  }

  &__title {
    flex: none;
    margin: 0;
  }

  // 副標與標題同一行：它說的是「這個畫面怎麼用」，看過一次就不必再看，
  // 不值得為它多佔一整行的高度。
  &__subtitle {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__context {
    display: flex;
    flex: none;
    gap: spacing('xs');
    align-items: center;
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
}
</style>
