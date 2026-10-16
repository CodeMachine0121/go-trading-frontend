<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'

/**
 * 有機體：看盤工作區的主選單——操作台的每一個去處，與每一頁共用的那幾項設定。
 *
 * 看盤工作區沒有側欄與頂欄（那些面積都給了圖），所以那兩條上的東西全部收到這裡：
 * 從左邊滑出，選了一個去處或點外面就收起。設定由版型以 slot 放進來，這裡只出位置。
 */
const { open, destinationPaths = {} } = defineProps<{
  open: boolean
  /** 導覽上某一格此刻實際要去的路（使用者最後停在合約時，「行情圖表」去合約那一頁）。 */
  destinationPaths?: Readonly<Record<string, string>>
}>()

const emit = defineEmits<{ close: [] }>()

const { t } = useI18n()
const { destinations, settingsDestination, isCurrent } = useConsoleDestinations()

function pathOf(destination: { to: string }): string {
  return destinationPaths[destination.to] ?? destination.to
}

function closeOnEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(() => open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('keydown', closeOnEscape)
  }
  else {
    document.removeEventListener('keydown', closeOnEscape)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', closeOnEscape)
})
</script>

<template>
  <div
    v-if="open"
    class="chart-workspace-menu"
    role="dialog"
    aria-modal="true"
    :aria-label="t('marketData.chartWorkspace.menuTitle')"
    data-testid="chart-workspace-menu"
  >
    <div
      class="chart-workspace-menu__backdrop"
      data-testid="chart-workspace-menu-backdrop"
      @click="emit('close')"
    />

    <nav
      class="chart-workspace-menu__drawer"
      :aria-label="t('marketData.chartWorkspace.menuTitle')"
    >
      <header class="chart-workspace-menu__brand">
        <span class="chart-workspace-menu__brand-name">Go Trading</span>
        <AppButton
          variant="chrome"
          size="small"
          :label="t('common.close')"
          data-testid="close-workspace-menu"
          @click="emit('close')"
        >
          <AppIcon
            name="close"
            stroke="fine"
          />
        </AppButton>
      </header>

      <ul class="chart-workspace-menu__destinations">
        <li
          v-for="destination in [...destinations, settingsDestination]"
          :key="destination.to"
        >
          <NuxtLink
            :to="pathOf(destination)"
            class="chart-workspace-menu__link"
            :class="{ 'chart-workspace-menu__link--current': isCurrent(destination) }"
            :aria-current="isCurrent(destination) ? 'page' : undefined"
            :data-testid="`menu-destination-${destination.to}`"
            @click="emit('close')"
          >
            <AppIcon
              :name="destination.icon"
              size="small"
            />
            {{ destination.label }}
          </NuxtLink>
        </li>
      </ul>

      <div class="chart-workspace-menu__settings">
        <slot name="settings" />
      </div>

      <footer class="chart-workspace-menu__footer">
        <slot name="footer" />
      </footer>
    </nav>
  </div>
</template>

<style scoped lang="scss">
.chart-workspace-menu {
  position: fixed;
  z-index: z-index('dock');
  inset: 0;

  &__backdrop {
    position: absolute;
    inset: 0;
    background-color: color('backdrop');
  }

  &__drawer {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    box-shadow: shadow('lg');
    background-color: color('surface-overlay');
    padding: calc(env(safe-area-inset-top, 0px) + #{spacing('xs')}) spacing('sm') calc(env(safe-area-inset-bottom, 0px) + #{spacing('sm')});
    width: min(20rem, 86vw);
    overflow-y: auto;
  }

  &__brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__brand-name {
    color: color('text-strong');
    font-size: font-size('md');
    font-weight: font-weight('bold');
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
    border-radius: radius('sm');
    padding: spacing('xs') spacing('sm');
    color: color('text');
    font-size: font-size('sm');
    text-decoration: none;

    &:hover {
      background-color: color('surface-muted');
    }

    &--current {
      background-color: color('primary-soft');
      color: color('primary');
    }
  }

  &__settings {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
    border-top: 1px solid color('border');
    padding-top: spacing('sm');
  }

  &__footer {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin-top: auto;
  }
}
</style>
