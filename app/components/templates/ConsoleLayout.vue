<script setup lang="ts">
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppModal from '~/components/atoms/AppModal.vue'
import { useLayoutDensity } from '~/composables/use-layout-density'

/**
 * 樣板：操作台的骨架。
 *
 * 寬螢幕是「側欄＋頂列＋工作區」，窄螢幕是「頂部標題列＋工作區＋底部五格」。
 * 它只出骨架與位置：連線燈、帳號、時區、現貨／合約開關、外觀切換與助手鍵
 * 全部由使用它的那一層用 slot 填進來，樣板不認識任何資料。
 *
 * **每個去處在導覽上只佔一格，但認得兩邊的路**：它實際要去哪一邊由 `destinationPaths` 說
 * （使用者最後停留的那一邊），人在合約 K 線圖表上時「行情圖表」照樣亮著——
 * 現貨與合約之間靠頂列的開關移動，不在導覽上各佔一格。
 */
const DESTINATIONS = [
  { to: '/k-candles/chart', label: '行情圖表', icon: 'candles', paths: ['/k-candles/chart', '/contract-k-candles/chart'], nested: false },
  { to: '/k-candles', label: 'K 線資料', icon: 'table', paths: ['/k-candles', '/contract-k-candles'], nested: false },
  { to: '/strategy-scripts', label: '策略腳本', icon: 'code', paths: ['/strategy-scripts', '/contract-strategy-scripts'], nested: false },
  { to: '/trading-strategies', label: '交易策略', icon: 'flow', paths: ['/trading-strategies'], nested: true },
  { to: '/strategy-bots', label: '策略機器人', icon: 'bot', paths: ['/strategy-bots', '/contract-strategy-bots'], nested: true },
  { to: '/marketplace', label: 'Marketplace', icon: 'store', paths: ['/marketplace'], nested: false },
] as const

const SETTINGS_DESTINATION = { to: '/settings', label: '設定', icon: 'settings', paths: ['/settings'], nested: false } as const

/** 窄螢幕底部直接露出來的四格（第五格是「更多」）。 */
const TAB_DESTINATIONS = [
  { to: '/k-candles/chart', label: '行情', icon: 'candles', paths: ['/k-candles/chart', '/contract-k-candles/chart'], nested: false },
  { to: '/strategy-scripts', label: '策略', icon: 'code', paths: ['/strategy-scripts', '/contract-strategy-scripts'], nested: false },
  { to: '/strategy-bots', label: '機器人', icon: 'bot', paths: ['/strategy-bots', '/contract-strategy-bots'], nested: true },
  { to: '/chat', label: '助手', icon: 'sparkle', paths: ['/chat'], nested: false },
] as const

/** 收在「更多」裡的去處。 */
const MORE_DESTINATIONS = [
  DESTINATIONS[1], DESTINATIONS[3], DESTINATIONS[5], SETTINGS_DESTINATION,
] as const

const { destinationPaths = {} } = defineProps<{
  title: string
  subtitle?: string
  /**
   * 這一頁要剛好撐滿視窗、自己在裡面捲（對話串與它的輸入框），而不是讓整頁一起往下長。
   * 版面因此固定成視窗的高度，工作區吃掉剩下的全部。
   */
  fillsViewport?: boolean
  /**
   * 導覽上某一格此刻實際要去的路（例如使用者最後切到合約時，「行情圖表」去合約 K 線圖表）。
   * 沒列在裡面的一格就去它自己的 `to`。樣板不判斷哪一邊，只照這份對照指路。
   */
  destinationPaths?: Readonly<Record<string, string>>
}>()

const { layoutDensity } = useLayoutDensity()
const route = useRoute()

/** 側欄收起來只剩圖示。跨畫面記著，換頁時不會彈回來。 */
const railStowed = useState('console-rail-stowed', () => false)

const moreOpen = ref(false)

function pathOf(destination: { to: string }): string {
  return destinationPaths[destination.to] ?? destination.to
}

function isCurrent(destination: { paths: readonly string[], nested: boolean }): boolean {
  return destination.paths.some(path => route.path === path
    || (destination.nested && route.path.startsWith(`${path}/`)))
}

/** 人在「更多」裡的畫面時，「更多」那一格自己亮——否則整排全暗，讀起來像哪裡都不在。 */
const insideMore = computed(() => MORE_DESTINATIONS.some(destination => isCurrent(destination)))

watch(() => route.fullPath, () => {
  moreOpen.value = false
})

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
      'console-layout--fills-viewport': fillsViewport,
    }"
  >
    <nav
      v-if="!layoutDensity.usesBottomNavigation"
      class="console-layout__rail"
      aria-label="操作台"
    >
      <div class="console-layout__brand">
        <span class="console-layout__brand-mark">
          <AppIcon
            name="candles"
            size="small"
          />
        </span>
        <span class="console-layout__brand-name">Go Trading</span>

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
          <NuxtLink
            :to="pathOf(destination)"
            class="console-layout__link"
            :class="{ 'console-layout__link--current': isCurrent(destination) }"
            :aria-current="isCurrent(destination) ? 'page' : undefined"
            :title="destination.label"
            :data-testid="`destination-${destination.to}`"
          >
            <AppIcon
              :name="destination.icon"
              size="small"
              class="console-layout__link-icon"
            />
            <span class="console-layout__link-label">{{ destination.label }}</span>
          </NuxtLink>
        </li>
      </ul>

      <div class="console-layout__rail-foot">
        <NuxtLink
          :to="SETTINGS_DESTINATION.to"
          class="console-layout__link"
          :class="{ 'console-layout__link--current': isCurrent(SETTINGS_DESTINATION) }"
          :aria-current="isCurrent(SETTINGS_DESTINATION) ? 'page' : undefined"
          :title="SETTINGS_DESTINATION.label"
          :data-testid="`destination-${SETTINGS_DESTINATION.to}`"
        >
          <AppIcon
            :name="SETTINGS_DESTINATION.icon"
            size="small"
            class="console-layout__link-icon"
          />
          <span class="console-layout__link-label">{{ SETTINGS_DESTINATION.label }}</span>
        </NuxtLink>

        <div class="console-layout__status">
          <slot name="status" />
        </div>

        <div class="console-layout__account">
          <slot name="account" />
        </div>
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

        <div class="console-layout__market">
          <slot name="market" />
        </div>

        <div
          v-if="!layoutDensity.usesBottomNavigation"
          class="console-layout__tools"
        >
          <slot name="timezone" />
          <slot name="appearance" />
          <slot name="assistant" />
        </div>
      </header>

      <main class="console-layout__workspace">
        <slot />
      </main>
    </div>

    <nav
      v-if="layoutDensity.usesBottomNavigation"
      class="console-layout__tabs"
      aria-label="操作台"
    >
      <NuxtLink
        v-for="destination in TAB_DESTINATIONS"
        :key="destination.to"
        :to="pathOf(destination)"
        class="console-layout__tab"
        :class="{ 'console-layout__tab--current': isCurrent(destination) }"
        :aria-current="isCurrent(destination) ? 'page' : undefined"
        :data-testid="`tab-${destination.to}`"
      >
        <AppIcon
          :name="destination.icon"
          class="console-layout__tab-icon"
        />
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
        <AppIcon
          name="menu"
          class="console-layout__tab-icon"
        />
        <span class="console-layout__tab-label">更多</span>
      </button>
    </nav>

    <AppModal
      v-if="layoutDensity.usesBottomNavigation"
      :open="moreOpen"
      title="更多"
      @close="moreOpen = false"
    >
      <ul class="console-layout__more-list">
        <li
          v-for="destination in MORE_DESTINATIONS"
          :key="destination.to"
        >
          <NuxtLink
            :to="pathOf(destination)"
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

      <div class="console-layout__more-tools">
        <slot name="timezone" />
        <slot name="appearance" />
      </div>

      <div class="console-layout__more-footer">
        <slot name="status" />
        <slot name="account" />
      </div>
    </AppModal>
  </div>
</template>

<style scoped lang="scss">
$rail-width: 13.5rem;
$rail-stowed-width: 4rem;

// 底部那一排的高度。它也以 --console-bottom-navigation-height 交給工作區裡的頁面，
// 讓頁面自己那一排釘在底部的動作鍵停在分頁列之上，而不是被它蓋住。
$bottom-navigation-height: 3.75rem;

.console-layout {
  display: grid;
  grid-template-columns: $rail-width minmax(0, 1fr);
  transition: grid-template-columns duration('normal') ease;
  background-color: color('background');
  min-height: 100dvh;

  &--stowed {
    grid-template-columns: $rail-stowed-width minmax(0, 1fr);
  }

  &--bottom-navigation {
    --console-bottom-navigation-height: calc(#{$bottom-navigation-height} + env(safe-area-inset-bottom, 0px));

    grid-template-rows: minmax(0, 1fr) auto;
    grid-template-columns: minmax(0, 1fr);
  }

  &--fills-viewport {
    height: 100dvh;
    overflow: hidden;
  }

  &--fills-viewport &__frame {
    min-height: 0;
  }

  &--fills-viewport &__workspace {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  &__rail {
    display: flex;
    position: sticky;
    top: 0;
    flex-direction: column;
    gap: spacing('3xs');
    border-right: 1px solid color('border');
    background-color: color('surface-raised');
    padding: spacing('sm') spacing('xs');
    height: 100dvh;
    overflow: hidden;
  }

  &__brand {
    display: flex;
    gap: spacing('xs');
    align-items: center;
    padding: spacing('2xs') spacing('2xs') spacing('md');
    color: color('text-strong');
    font-weight: font-weight('bold');
    white-space: nowrap;
  }

  &__brand-mark {
    display: grid;
    flex: none;
    place-items: center;
    border-radius: radius('sm');
    background-image: linear-gradient(135deg, color('primary'), color('primary-strong'));
    width: 1.75rem;
    height: 1.75rem;
    color: color('text-inverse');
  }

  &__brand-name {
    flex: 1;
    overflow: hidden;
  }

  &__stow-chevron {
    transform: rotate(180deg);
    transition: transform duration('normal') ease;
  }

  &--stowed &__stow-chevron {
    transform: none;
  }

  &--stowed &__brand-name,
  &--stowed &__link-label {
    @include visually-hidden;
  }

  &--stowed &__brand {
    flex-direction: column;
  }

  &--stowed &__status,
  &--stowed &__account {
    display: none;
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
    padding: spacing('2xs') spacing('xs');
    color: color('text-muted');
    font-weight: font-weight('medium');
    font-size: font-size('sm');
    white-space: nowrap;
    text-decoration: none;

    @include focus-ring;
    @include tap-target;

    &:hover {
      background-color: color('surface-muted');
      color: color('text-strong');
    }

    &--current {
      background-color: color('primary-soft');
      color: color('text-strong');
    }
  }

  &__link--current &__link-icon {
    color: color('primary');
  }

  &__rail-foot {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin-top: auto;
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }

  &__status,
  &__account {
    padding: 0 spacing('2xs');
  }

  &__frame {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__strip {
    display: flex;
    position: sticky;
    top: 0;
    z-index: z-index('chrome');
    flex-wrap: wrap;
    gap: spacing('sm');
    align-items: center;
    border-bottom: 1px solid color('border');
    background-color: color('background');
    padding: spacing('xs') spacing('md');
  }

  &__heading {
    flex: 1;
    min-width: 0;
  }

  // 窄螢幕：標題與開關一行，說明自己一整行、最多兩行——擠在開關旁邊那一欄裡的話，
  // 一句四十個字的說明會被壓成一行六個字，高度吃掉半個畫面。
  &--bottom-navigation &__strip {
    display: grid;
    grid-template-areas: 'title market' 'subtitle subtitle';
    grid-template-columns: minmax(0, 1fr) auto;
    row-gap: spacing('3xs');
  }

  &--bottom-navigation &__heading {
    display: contents;
  }

  &--bottom-navigation &__title {
    grid-area: title;
    align-self: center;
  }

  &--bottom-navigation &__subtitle {
    display: -webkit-box;
    grid-area: subtitle;
    -webkit-box-orient: vertical;
    margin: 0;
    overflow: hidden;
    -webkit-line-clamp: 2;
  }

  &--bottom-navigation &__market {
    grid-area: market;
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-size: font-size('lg');
    line-height: line-height('tight');
  }

  &__subtitle {
    margin: spacing('3xs') 0 0;
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__market,
  &__tools {
    display: flex;
    gap: spacing('xs');
    align-items: center;
  }

  &__workspace {
    flex: 1;
    padding: spacing('md');
    min-width: 0;
  }

  &__tabs {
    display: grid;
    position: sticky;
    bottom: 0;
    grid-template-columns: repeat(5, 1fr);
    z-index: z-index('chrome');
    align-content: center;
    border-top: 1px solid color('border');
    background-color: color('surface');
    padding: 0 spacing('2xs');
    height: var(--console-bottom-navigation-height);

    @include safe-area-bottom;
  }

  &__tab {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    align-items: center;
    border: none;
    background: none;
    cursor: pointer;
    padding: spacing('2xs') 0;
    color: color('text-faint');
    font-weight: font-weight('medium');
    font-size: font-size('2xs');
    text-decoration: none;

    @include focus-ring;
    @include tap-target;

    &--current {
      color: color('text-strong');
    }
  }

  &__tab--current &__tab-icon {
    color: color('primary');
  }

  &__more-list {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0 spacing('md');
    list-style: none;
  }

  &__more-link {
    display: flex;
    gap: spacing('sm');
    align-items: center;
    border-bottom: 1px solid color('border');
    padding: spacing('sm') 0;
    color: color('text');
    text-decoration: none;

    @include focus-ring;
    @include tap-target;
  }

  &__more-label {
    flex: 1;
  }

  &__more-chevron {
    color: color('text-faint');
  }

  &__more-tools,
  &__more-footer {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('sm');
    align-items: center;
    padding: spacing('md');
  }

  &__more-footer {
    justify-content: space-between;
    border-top: 1px solid color('border');
  }
}
</style>
