<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import ContractTradeSummaryStrip from '~/components/molecules/ContractTradeSummaryStrip.vue'
import ContractTradeRMultipleChart from '~/components/molecules/ContractTradeRMultipleChart.vue'
import type { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { ContractTradeStatisticsPeriod } from '~/domain/models/vo/contract-trade-statistics-period-vo'

const { statistics = null, loading = false, failureMessage = null, periodOptions, timeZone } = defineProps<{
  statistics?: ContractTradeStatisticsDto | null
  loading?: boolean
  failureMessage?: string | null
  periodOptions: readonly JournalOptionDto[]
  timeZone: TimeZoneDto
}>()

const period = defineModel<ContractTradeStatisticsPeriod>('period', { required: true })

const periodTab = computed({
  get: () => period.value,
  set: (value: string) => {
    period.value = value as ContractTradeStatisticsPeriod
  },
})
</script>

<template>
  <div class="contract-trade-statistics-panel">
    <AppTabs
      v-model="periodTab"
      :options="periodOptions"
      variant="segmented"
      data-testid="statistics-period"
    />

    <p
      v-if="loading && !statistics"
      class="contract-trade-statistics-panel__state"
      data-testid="statistics-loading"
    >
      讀取中…
    </p>

    <AppAlert
      v-else-if="failureMessage"
      tone="danger"
      data-testid="statistics-failure"
    >
      {{ failureMessage }}
    </AppAlert>

    <template v-else-if="statistics">
      <p
        v-if="statistics.emptyMessage"
        class="contract-trade-statistics-panel__state"
        data-testid="statistics-empty"
      >
        {{ statistics.emptyMessage }}
      </p>

      <template v-else>
        <ContractTradeSummaryStrip :figures="statistics.figures" />
        <p
          v-if="statistics.exclusionNote"
          class="contract-trade-statistics-panel__note"
          data-testid="statistics-exclusion"
        >
          {{ statistics.exclusionNote }}
        </p>

        <div class="contract-trade-statistics-panel__charts">
          <AppPanel title="累積 R">
            <ContractTradeRMultipleChart
              :points="statistics.cumulativePoints"
              :time-zone="timeZone"
            />
          </AppPanel>
          <AppPanel title="R 分布">
            <ul
              class="contract-trade-statistics-panel__bars"
              data-testid="r-distribution"
            >
              <li
                v-for="bar in statistics.distribution"
                :key="bar.label"
                class="contract-trade-statistics-panel__bar-row"
              >
                <span class="contract-trade-statistics-panel__bar-label">{{ bar.label }}</span>
                <span class="contract-trade-statistics-panel__track">
                  <span
                    class="contract-trade-statistics-panel__bar"
                    :class="`contract-trade-statistics-panel__bar--${bar.tone}`"
                    :style="{ width: `${bar.widthPercentage}%` }"
                  />
                </span>
                <span class="contract-trade-statistics-panel__bar-count">{{ bar.count }}</span>
              </li>
            </ul>
          </AppPanel>
        </div>

        <div class="contract-trade-statistics-panel__tables">
          <AppPanel title="失誤花了多少">
            <p
              v-if="statistics.mistakeCosts.length === 0"
              class="contract-trade-statistics-panel__state"
            >
              這段期間沒有貼失誤標籤的交易
            </p>
            <table
              v-else
              class="contract-trade-statistics-panel__table"
              data-testid="mistake-costs"
            >
              <tbody>
                <tr
                  v-for="mistakeCost in statistics.mistakeCosts"
                  :key="mistakeCost.tagName"
                >
                  <td>{{ mistakeCost.tagName }}</td>
                  <td>{{ mistakeCost.tradeCountText }}</td>
                  <td :class="`contract-trade-statistics-panel__tone--${mistakeCost.tone}`">
                    {{ mistakeCost.rMultipleText }}
                  </td>
                </tr>
              </tbody>
            </table>
          </AppPanel>
          <AppPanel title="有關聯策略 vs 自行判斷">
            <table
              class="contract-trade-statistics-panel__table"
              data-testid="source-comparison"
            >
              <thead>
                <tr>
                  <th>來源</th>
                  <th>筆數</th>
                  <th>勝率</th>
                  <th>平均 R</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in statistics.sourceComparison"
                  :key="row.label"
                >
                  <td>{{ row.label }}</td>
                  <td>{{ row.tradeCountText }}</td>
                  <td>{{ row.winRateText }}</td>
                  <td>{{ row.averageRMultipleText }}</td>
                </tr>
              </tbody>
            </table>
          </AppPanel>
        </div>
      </template>
    </template>
  </div>
</template>

<style scoped lang="scss">
.contract-trade-statistics-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__state,
  &__note {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__charts,
  &__tables {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('md');

    @include respond-to('lg') {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  &__bars {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__bar-row {
    display: grid;
    grid-template-columns: 4rem minmax(0, 1fr) 2rem;
    gap: spacing('xs');
    align-items: center;
    font-size: font-size('xs');
  }

  &__bar-label {
    color: color('text-muted');
  }

  &__track {
    border-radius: radius('sm');
    background-color: color('surface-muted');
    height: spacing('xs');
    overflow: hidden;
  }

  &__bar {
    display: block;
    height: 100%;

    &--success {
      background-color: color('success');
    }

    &--danger {
      background-color: color('danger');
    }
  }

  &__bar-count {
    text-align: right;

    @include numeric;
  }

  &__table {
    @include time-series-table;

    td.contract-trade-statistics-panel__tone--danger {
      color: color('danger');
    }

    td.contract-trade-statistics-panel__tone--success {
      color: color('success');
    }
  }
}
</style>
