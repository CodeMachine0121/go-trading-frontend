<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import DisplayLanguageField from '~/components/molecules/DisplayLanguageField.vue'
import MarketSwitch from '~/components/molecules/MarketSwitch.vue'
import AppearanceToggle from '~/components/molecules/AppearanceToggle.vue'

// 操作台的版型：每一頁共用的那一圈（連線燈、帳號、時區、現貨／合約開關、外觀、助手鍵）
// 由 useConsoleShell 接好，這裡只負責擺進頂欄與側欄。頁面只宣告自己的標題
// （definePageMeta 的 consoleTitleKey / consoleSubtitleKey）與自己的內容。
const {
  route, counterpart, destinationPaths, title, subtitle,
  selectableTimeZones, selectedTimeZone, selectTimeZone,
  selectableLanguages, selectedLanguageCode, selectLanguage,
  health, checking, errorMessage, checkBackendHealth,
  currentUser, signOut,
  appearance, selectAppearance,
  openDrawer,
} = useConsoleShell()
const { t } = useI18n()
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

    <template #language>
      <DisplayLanguageField
        :model-value="selectedLanguageCode"
        :selectable-languages="selectableLanguages"
        @update:model-value="selectLanguage"
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
        {{ t('shell.navigation.openAssistant') }}
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
