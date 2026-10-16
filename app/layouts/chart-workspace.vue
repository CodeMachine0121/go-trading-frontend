<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ChartWorkspaceMenu from '~/components/organisms/ChartWorkspaceMenu.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import TimeZoneField from '~/components/molecules/TimeZoneField.vue'
import DisplayLanguageField from '~/components/molecules/DisplayLanguageField.vue'
import AppearanceToggle from '~/components/molecules/AppearanceToggle.vue'

// 看盤工作區的版型：沒有頂欄、沒有側欄，整個視窗給行情圖表。
// 每一頁共用的那一圈（時區、語言、外觀、助手、連線燈、帳號、每一個去處）收進主選單；
// 現貨／合約開關由頁面自己放進工作區的上方細邊——它是看盤時最常按的那一顆。
const {
  route, destinationPaths,
  selectableTimeZones, selectedTimeZone, selectTimeZone,
  selectableLanguages, selectedLanguageCode, selectLanguage,
  health, checking, errorMessage, checkBackendHealth,
  currentUser, signOut,
  appearance, selectAppearance,
  openDrawer,
} = useConsoleShell()
const { t } = useI18n()
const { menuOpen, closeMenu } = useChartWorkspaceMenu()

// 換了頁，主選單就收起來——選了一個去處，那個去處不該被一張還開著的選單蓋住。
watch(() => route.fullPath, closeMenu)

function openAssistant() {
  closeMenu()
  openDrawer()
}
</script>

<template>
  <div class="chart-workspace-layout">
    <slot />

    <ChartWorkspaceMenu
      :open="menuOpen"
      :destination-paths="destinationPaths"
      @close="closeMenu"
    >
      <template #settings>
        <DisplayLanguageField
          :model-value="selectedLanguageCode"
          :selectable-languages="selectableLanguages"
          @update:model-value="selectLanguage"
        />
        <TimeZoneField
          :model-value="selectedTimeZone.identifier"
          :selectable-time-zones="selectableTimeZones"
          @update:model-value="selectTimeZone"
        />
        <AppearanceToggle
          v-if="appearance"
          :appearance="appearance"
          @select="selectAppearance"
        />
        <AppButton
          variant="accent"
          shape="pill"
          data-testid="open-assistant"
          @click="openAssistant"
        >
          <AppIcon
            name="sparkle"
            size="small"
          />
          {{ t('shell.navigation.openAssistant') }}
        </AppButton>
      </template>

      <template #footer>
        <BackendStatusIndicator
          :health="health"
          :checking="checking"
          :error-message="errorMessage"
          @recheck="checkBackendHealth"
        />
        <SignedInUserBadge
          v-if="currentUser"
          :user="currentUser"
          @sign-out="signOut"
        />
      </template>
    </ChartWorkspaceMenu>
  </div>
</template>

<style scoped lang="scss">
// 剛好撐滿視窗、自己不捲：圖要的是整個視窗，捲動只會把細邊推出畫面外。
.chart-workspace-layout {
  height: 100dvh;
  overflow: hidden;
  background-color: color('chart-workspace-seam');
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0);
}
</style>
