<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppSelect from '~/components/atoms/AppSelect.vue'
import BacktestRunPanel from '~/components/organisms/BacktestRunPanel.vue'
import type { BacktestApplication } from '~/application/backtest-application'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import { BacktestRunListQueryDto } from '~/domain/models/dto/backtest-run-list-query-dto'
import type { BacktestRunStatus } from '~/domain/models/vo/backtest-run-status-vo'

// 模板：回測紀錄那一頁——全部的輪次，可依狀態篩，點開看成績單。
const { backtestApplication, timeZone } = defineProps<{
  backtestApplication: BacktestApplication
  timeZone: TimeZoneDto
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const statusOptions = backtestApplication.listBacktestRunStatusOptions()
const statusFilter = ref<BacktestRunStatus | ''>('')

const scope = computed(() => new BacktestRunListQueryDto(statusFilter.value === '' ? null : statusFilter.value))
</script>

<template>
  <div class="backtest-runs-page">
    <BacktestRunPanel
      :backtest-application="backtestApplication"
      :time-zone="timeZone"
      :scope="scope"
      :empty-message="t('backtest.runs.empty')"
    >
      <template #meta>
        <label class="backtest-runs-page__filter">
          <span class="backtest-runs-page__filter-label">{{ t('backtest.runs.statusFilter') }}</span>
          <AppSelect
            v-model="statusFilter"
            data-testid="backtest-run-status-filter"
          >
            <option value="">
              {{ t('backtest.runs.allStatuses') }}
            </option>
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ localize(option.label) }}
            </option>
          </AppSelect>
        </label>
      </template>
    </BacktestRunPanel>
  </div>
</template>

<style scoped lang="scss">
.backtest-runs-page {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__filter {
    display: flex;
    align-items: center;
    gap: spacing('2xs');
  }

  &__filter-label {
    color: color('text-muted');
    font-size: font-size('xs');
  }
}
</style>
