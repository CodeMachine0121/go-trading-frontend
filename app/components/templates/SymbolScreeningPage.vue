<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import SymbolScreeningProfilePanel from '~/components/organisms/SymbolScreeningProfilePanel.vue'
import SymbolScreeningSubmitPanel from '~/components/organisms/SymbolScreeningSubmitPanel.vue'
import SymbolScreeningRunPanel from '~/components/organisms/SymbolScreeningRunPanel.vue'
import type { SymbolScreeningApplication } from '~/application/symbol-screening-application'
import type { SymbolScreeningRunDto } from '~/domain/models/dto/symbol-screening-run-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { useSymbolScreeningProfiles } from '~/composables/use-symbol-screening-profiles'

// Template: the administrator's screening page; anyone else only sees that it is administrators only.
const { symbolScreeningApplication, timeZone, isAdministrator } = defineProps<{
  symbolScreeningApplication: SymbolScreeningApplication
  timeZone: TimeZoneDto
  isAdministrator: boolean
}>()

const { t } = useI18n()

const profileList = useSymbolScreeningProfiles(symbolScreeningApplication)
const aggregationIntervalOptions = symbolScreeningApplication.listAggregationIntervalOptions()
const tradingModeOptions = symbolScreeningApplication.listTradingModeOptions()
const submittedRun = ref<SymbolScreeningRunDto | null>(null)

onMounted(() => {
  if (isAdministrator) {
    void profileList.load()
  }
})
</script>

<template>
  <AppAlert
    v-if="!isAdministrator"
    tone="warning"
    data-testid="symbol-screening-administrator-only"
  >
    {{ t('symbolScreening.common.administratorOnly') }}
  </AppAlert>

  <div
    v-else
    class="symbol-screening-page"
  >
    <SymbolScreeningProfilePanel
      :profiles="profileList.profiles.value"
      :screenable-strategy-scripts="profileList.screenableStrategyScripts.value"
      :aggregation-interval-options="aggregationIntervalOptions"
      :trading-mode-options="tradingModeOptions"
      :loading="profileList.loading.value"
      :failure-message="profileList.failureMessage.value"
      :saving="profileList.saving.value"
      :save-failure-message="profileList.saveFailureMessage.value"
      :save-profile="profileList.save"
      @remove="profileList.remove"
      @close-form="profileList.clearSaveFailure"
    />
    <SymbolScreeningSubmitPanel
      :symbol-screening-application="symbolScreeningApplication"
      :profiles="profileList.profiles.value"
      @submitted="submittedRun = $event"
    />
    <SymbolScreeningRunPanel
      :symbol-screening-application="symbolScreeningApplication"
      :time-zone="timeZone"
      :submitted-run="submittedRun"
    />
  </div>
</template>

<style scoped lang="scss">
.symbol-screening-page {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');
}
</style>
