<script setup lang="ts">
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'
import AppearanceToggle from '~/components/molecules/AppearanceToggle.vue'

// 操作台的版型：每一頁共用的那一圈（連線燈、帳號、時區、現貨／合約開關、外觀、助手鍵）
// 只在這裡接一次線。頁面只宣告自己的標題（definePageMeta 的 consoleTitle / consoleSubtitle）
// 與自己的內容——以前每一頁各自接這一圈，同一段接線抄了十幾份。
const route = useRoute()
const { $marketCounterpartApplication } = useNuxtApp()

const { selectableTimeZones, selectedTimeZone, selectTimeZone } = useSelectedTimeZone()
const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()
const { appearance, selectAppearance } = useAppearance()
const { openDrawer } = useAssistantDrawer()

const counterpart = computed(() => $marketCounterpartApplication.describeCounterpart(route.path))

// 到了哪一邊的頁面就記住哪一邊；導覽上有兩邊的那幾格跟著它指路，不必每一頁再切一次。
const { followPath, pathOnMarketSide } = useMarketSide()
watch(() => route.path, followPath, { immediate: true })

const SIDE_AWARE_DESTINATIONS = ['/k-candles/chart', '/k-candles', '/strategy-scripts', '/strategy-bots']
const destinationPaths = computed(
  () => Object.fromEntries(SIDE_AWARE_DESTINATIONS.map(path => [path, pathOnMarketSide(path)])))
const title = computed(() => route.meta.consoleTitle ?? '')
const subtitle = computed(() => route.meta.consoleSubtitle)
</script>

<template>
  <ConsoleLayout
    :title="title"
    :subtitle="subtitle"
    :fills-viewport="route.meta.consoleFillsViewport === true"
    :destination-paths="destinationPaths"
  >
    <template #market>
      <MarketSwitch
        :counterpart="counterpart"
        @navigate="path => navigateTo(path)"
      />
    </template>

    <template #timezone>
      <TimeZoneField
        :model-value="selectedTimeZone.identifier"
        :selectable-time-zones="selectableTimeZones"
        @update:model-value="selectTimeZone"
      />
    </template>

    <template #appearance>
      <AppearanceToggle
        v-if="appearance"
        :appearance="appearance"
        @select="selectAppearance"
      />
    </template>

    <template #assistant>
      <AppButton
        variant="accent"
        shape="pill"
        data-testid="open-assistant"
        @click="openDrawer()"
      >
        <AppIcon
          name="sparkle"
          size="small"
        />
        AI 助手
      </AppButton>
    </template>

    <template #status>
      <BackendStatusIndicator
        :health="health"
        :checking="checking"
        :error-message="errorMessage"
        @recheck="checkBackendHealth"
      />
    </template>

    <template #account>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

    <slot />
  </ConsoleLayout>
</template>
