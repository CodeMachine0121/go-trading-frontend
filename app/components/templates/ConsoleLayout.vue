<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import { useLayoutDensity } from '~/composables/use-layout-density'

// 樣板：全站共用的版面骨架，只有結構與插槽，不綁任何資料。
//
// 這一版把版面從「置中的一欄文件」換成交易終端機的外框：
// 導覽收進左邊一條固定的側欄，頂上留一條窄帶說「我在哪一個畫面」，
// 剩下的整片都是工作區。四個畫面走到哪裡，外框都在同一個位置，
// 而且工作區永遠填滿視窗——表格與圖在自己的框裡捲，不是整頁一起捲。
//
// 窄螢幕上那條側欄改成**一片叫得出來的抽屜**：平時不佔任何高度，
// 按一下蓋在畫面上，九個去處一次全看得到，選一個就收起來。
// 它取代的是更早那一版「躺平成頂上一條橫著捲的窄帶」——九個去處
// 在平板的寬度也塞不滿一條而不捲，於是第七、八、九個永遠藏在捲動之外，
// 而那條窄帶還一直吃著手機上最稀缺的高度。
//
// **去處的清單只寫一次**，兩種形狀由樣式決定。複製第二份標記的話，
// 讀螢幕的人會聽到兩份導覽，而其中一份永遠是看不見的那一份。
//
// 導覽是骨架的一部分（「這個操作台有哪幾個地方可去」），不是資料；
// 需要即時去問後端的東西（那顆燈、時區）一律由頁面填進插槽。
const DESTINATIONS = [
  { to: '/', label: '連線狀態', icon: 'connection' },
  { to: '/k-candles', label: 'K 線瀏覽', icon: 'table' },
  { to: '/k-candles/chart', label: 'K 線圖表', icon: 'candles' },
  { to: '/watchlist', label: '觀察清單', icon: 'table' },
  { to: '/indicator-calculations', label: '指標計算', icon: 'formula' },
  { to: '/marketplace', label: '策略腳本市集', icon: 'library' },
  // 機器人排在市集之後、助手之前：市集是「有什麼可以用」，這裡是「我派了誰出去」，
  // 兩者是同一件事的前後兩步。
  { to: '/strategy-bots', label: '策略機器人', icon: 'standing-bot' },
  { to: '/chat', label: '行情助手', icon: 'robot' },
  { to: '/settings', label: '設定', icon: 'settings' },
] as const

defineProps<{
  title: string
  subtitle?: string
}>()

const { layoutDensity } = useLayoutDensity()

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

/**
 * 抽屜開著沒有。
 *
 * 與側欄收合相反，它**不**跨畫面共用：抽屜是「我現在要去別的地方」這個當下的動作，
 * 到了那個地方它的任務就結束了。換頁時它跟著這個元件一起重新掛載成關著的樣子，
 * 正是它該有的行為。
 */
const navigationDrawerOpen = ref(false)

/**
 * 視窗變寬到不再需要抽屜時，把它關掉。
 *
 * 不關的話，那個「開著」會留在狀態裡：使用者把視窗拉寬、再拉窄回來，
 * 抽屜就會自己跳出來，而他沒有按過任何東西。
 */
watch(() => layoutDensity.value.usesNavigationDrawer, (usesDrawer) => {
  if (!usesDrawer) {
    navigationDrawerOpen.value = false
  }
})

// Esc 關掉疊在畫面上的東西，是使用者對它既有的預期；只在開著的時候聽，
// 免得與對話框搶同一個按鍵。
watch(navigationDrawerOpen, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', closeNavigationDrawerOnEscape)
  }
  else {
    document.removeEventListener('keydown', closeNavigationDrawerOnEscape)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeNavigationDrawerOnEscape)
})

function closeNavigationDrawerOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    navigationDrawerOpen.value = false
  }
}
</script>

<template>
  <div
    class="console-layout"
    :class="{
      'console-layout--stowed': railStowed,
      'console-layout--drawer-open': navigationDrawerOpen,
    }"
  >
    <!--
      點在抽屜以外的地方只是把它收起來，**不是**換到別的畫面——
      使用者叫出去處清單之後改變主意，那是最常見的一件事。
    -->
    <div
      v-if="layoutDensity.usesNavigationDrawer && navigationDrawerOpen"
      class="console-layout__scrim"
      data-testid="navigation-scrim"
      @click="navigationDrawerOpen = false"
    />

    <nav
      id="console-destinations"
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
            @click="navigationDrawerOpen = false"
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
        <!--
          窄螢幕上唯一的導覽入口。它**只在那時候才畫出來**：
          一顆在寬螢幕上什麼都不做的鍵，對讀螢幕的人是一條假的路。
        -->
        <AppButton
          v-if="layoutDensity.usesNavigationDrawer"
          variant="ghost"
          size="small"
          class="console-layout__menu"
          :label="navigationDrawerOpen ? '關閉導覽' : '開啟導覽'"
          :aria-expanded="navigationDrawerOpen"
          aria-controls="console-destinations"
          data-testid="toggle-navigation"
          @click="navigationDrawerOpen = !navigationDrawerOpen"
        >
          <AppIcon
            :name="navigationDrawerOpen ? 'close' : 'menu'"
            size="small"
          />
        </AppButton>

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
/** 抽屜蓋出來時有多寬。留一段讓底下的畫面露出來，人才看得出它只是疊在上面。 */
$navigation-drawer-width: 15rem;

.console-layout {
  display: grid;

  // 窄螢幕：只有一欄，整片都是工作區——導覽疊在它上面，不佔格子。
  grid-template-rows: minmax(0, 1fr);
  height: 100%;

  @include respond-to('lg') {
    grid-template-columns: 13rem minmax(0, 1fr);
  }

  // 收起來只在側欄真的是一條側欄時才成立。窄螢幕上它是一片叫得出來的抽屜，
  // 那時候「收起來」與「關起來」是同一件事，不需要第二顆鍵。
  &--stowed {
    @include respond-to('lg') {
      grid-template-columns: 3rem minmax(0, 1fr);
    }
  }

  // 抽屜後面那一層。它是可以點的，而點它只是把抽屜收起來。
  //
  // 它與抽屜同一個層級，靠**先後順序**決定誰在上面——抽屜在它後面畫，所以在它上面。
  // 給它們兩個不同的層級沒有好處：那會多出一個要跟著維護的名字，
  // 而它們永遠是一起出現、一起消失的同一件東西。
  &__scrim {
    position: fixed;
    z-index: z-index('modal');
    inset: 0;
    background-color: color('backdrop');

    @include respond-to('lg') {
      display: none;
    }
  }

  &__rail {
    position: fixed;
    z-index: z-index('modal');
    inset: 0 auto 0 0;
    display: flex;
    flex-direction: column;
    gap: spacing('lg');
    transition: transform duration('normal') ease;

    // 平時整片推到畫面外：它不佔高度、不佔寬度，工作區因此是完整的一整片。
    transform: translateX(-100%);
    border-right: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('md') spacing('sm');
    width: $navigation-drawer-width;
    overflow-y: auto;

    @include respond-to('lg') {
      position: static;
      transform: none;
      width: auto;
      overflow-y: visible;
    }
  }

  &--drawer-open &__rail {
    transform: translateX(0);
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

    // 燈釘在側欄最底下——那是終端機放「線路狀態」的位置。
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
    gap: spacing('sm');
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid color('border');
    background-color: color('surface');
    padding: spacing('xs') spacing('md');

    @include respond-to('lg') {
      align-items: baseline;
      gap: spacing('md');
    }
  }

  &__menu {
    flex: none;
    color: color('text-faint');
  }

  &__heading {
    display: flex;
    flex: 1;
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
