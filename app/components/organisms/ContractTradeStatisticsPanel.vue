<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import TradeSummaryStrip from '~/components/molecules/TradeSummaryStrip.vue'
import TradeCumulativeChart from '~/components/molecules/TradeCumulativeChart.vue'
import type { ContractTradeStatisticsDto } from '~/domain/models/dto/contract-trade-statistics-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'
import type { LocalizedTextVo } from '~/domain/models/vo/localized-text-vo'

const { statistics = null, loading = false, failureMessage = null, periodOptions, timeZone } = defineProps<{
  statistics?: ContractTradeStatisticsDto | null
  loading?: boolean
  failureMessage?: LocalizedTextVo | null
  periodOptions: readonly JournalOptionDto[]
  timeZone: TimeZoneDto
}>()

const period = defineModel<TradeStatisticsPeriod>('period', { required: true })

const { t } = useI18n()
const { localize } = useLocalizedText()

const periodTabOptions = computed(() => periodOptions.map(option => ({ value: option.value, label: localize(option.label) })))

const periodTab = computed({
  get: () => period.value,
  set: (value: string) => {
    period.value = value as TradeStatisticsPeriod
  },
})
</script>

<template>
  <div class="contract-trade-statistics-panel">
    <header class="contract-trade-statistics-panel__header">
      <p
        v-if="statistics"
        class="contract-trade-statistics-panel__headline"
        data-testid="statistics-headline"
      >
        {{ t('contractTradeJournal.statistics.headline', { period: localize(statistics.periodLabel), closedTradeCount: localize(statistics.closedTradeCountText) }) }}
      </p>
      <AppTabs
        v-model="periodTab"
        :options="periodTabOptions"
        variant="segmented"
        data-testid="statistics-period"
      />
    </header>

    <p
      v-if="loading && !statistics"
      class="contract-trade-statistics-panel__state"
      data-testid="statistics-loading"
    >
      {{ t('contractTradeJournal.common.loading') }}
    </p>

    <AppAlert
      v-else-if="failureMessage"
      tone="danger"
      data-testid="statistics-failure"
    >
      {{ localize(failureMessage) }}
    </AppAlert>

    <template v-else-if="statistics">
      <p
        v-if="statistics.emptyMessage"
        class="contract-trade-statistics-panel__state"
        data-testid="statistics-empty"
      >
        {{ localize(statistics.emptyMessage) }}
      </p>

      <template v-else>
        <TradeSummaryStrip :figures="statistics.figures" />
        <p
          v-if="statistics.exclusionNote"
          class="contract-trade-statistics-panel__note"
          data-testid="statistics-exclusion"
        >
          {{ localize(statistics.exclusionNote) }}
        </p>

        <div class="contract-trade-statistics-panel__charts">
          <AppPanel :title="t('contractTradeJournal.statistics.cumulativeR')">
            <template
              v-if="statistics.totalRMultiple"
              #actions
            >
              <span
                class="contract-trade-statistics-panel__total"
                :class="`contract-trade-statistics-panel__total--${statistics.totalRMultiple.tone}`"
                data-testid="statistics-total-r"
              >{{ localize(statistics.totalRMultiple.text) }}</span>
            </template>
            <TradeCumulativeChart
              :points="statistics.cumulativePoints"
              :time-zone="timeZone"
            />
          </AppPanel>
          <AppPanel :title="t('contractTradeJournal.statistics.rDistribution')">
            <ul
              class="contract-trade-statistics-panel__histogram"
              data-testid="r-distribution"
            >
              <li
                v-for="bar in statistics.distribution"
                :key="bar.label"
                class="contract-trade-statistics-panel__column"
              >
                <span class="contract-trade-statistics-panel__bar-count">{{ bar.count }}</span>
                <span class="contract-trade-statistics-panel__column-track">
                  <span
                    class="contract-trade-statistics-panel__column-bar"
                    :class="`contract-trade-statistics-panel__bar--${bar.tone}`"
                    :style="{ height: `${bar.widthPercentage}%` }"
                  />
                </span>
                <span class="contract-trade-statistics-panel__bar-label">{{ bar.label }}</span>
              </li>
            </ul>
          </AppPanel>
        </div>

        <div class="contract-trade-statistics-panel__tables">
          <AppPanel :title="t('contractTradeJournal.statistics.mistakeCosts')">
            <template #actions>
              <span class="contract-trade-statistics-panel__caption">{{ t('contractTradeJournal.statistics.rTotal') }}</span>
            </template>
            <p
              v-if="statistics.mistakeCosts.length === 0"
              class="contract-trade-statistics-panel__state"
            >
              {{ t('contractTradeJournal.statistics.noMistakes') }}
            </p>
            <ul
              v-else
              class="contract-trade-statistics-panel__bars"
              data-testid="mistake-costs"
            >
              <li
                v-for="mistakeCost in statistics.mistakeCosts"
                :key="mistakeCost.tagName"
                class="contract-trade-statistics-panel__bar-row"
              >
                <span class="contract-trade-statistics-panel__bar-label">{{ mistakeCost.tagName }}<small>{{ localize(mistakeCost.tradeCountText) }}</small></span>
                <span class="contract-trade-statistics-panel__track">
                  <span
                    class="contract-trade-statistics-panel__bar"
                    :class="`contract-trade-statistics-panel__bar--${mistakeCost.tone}`"
                    :style="{ width: `${mistakeCost.widthPercentage}%` }"
                  />
                </span>
                <span
                  class="contract-trade-statistics-panel__bar-count"
                  :class="`contract-trade-statistics-panel__tone--${mistakeCost.tone}`"
                >{{ mistakeCost.rMultipleText }}</span>
              </li>
            </ul>
          </AppPanel>
          <AppPanel :title="t('contractTradeJournal.statistics.sourceComparison')">
            <table
              class="contract-trade-statistics-panel__table"
              data-testid="source-comparison"
            >
              <thead>
                <tr>
                  <th>{{ t('contractTradeJournal.statistics.columns.source') }}</th>
                  <th>{{ t('contractTradeJournal.statistics.columns.tradeCount') }}</th>
                  <th>{{ t('contractTradeJournal.statistics.columns.winRate') }}</th>
                  <th>{{ t('contractTradeJournal.statistics.columns.averageR') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in statistics.sourceComparison"
                  :key="row.label.traditionalChinese"
                >
                  <td>{{ localize(row.label) }}</td>
                  <td>{{ localize(row.tradeCountText) }}</td>
                  <td>{{ localize(row.winRateText) }}</td>
                  <td>{{ localize(row.averageRMultipleText) }}</td>
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

  &__header {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    justify-content: space-between;
    align-items: center;
  }

  &__headline {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__total {
    font-weight: font-weight('semibold');
    font-size: font-size('sm');

    @include numeric;

    &--success {
      color: color('success');
    }

    &--danger {
      color: color('danger');
    }
  }

  &__caption {
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__histogram {
    display: flex;
    gap: spacing('xs');
    align-items: stretch;
    margin: 0;
    padding: 0;
    height: 11rem;
    list-style: none;
  }

  &__column {
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    gap: spacing('3xs');
    align-items: center;
    font-size: font-size('2xs');
  }

  &__column-track {
    display: flex;
    flex: 1 1 auto;
    align-items: flex-end;
    width: 64%;
  }

  &__column-bar {
    display: block;
    border-radius: radius('xs') radius('xs') 0 0;
    width: 100%;
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
    grid-template-columns: 7rem minmax(0, 1fr) 3.5rem;
    gap: spacing('xs');
    align-items: center;
    font-size: font-size('xs');
  }

  &__bar-label {
    display: flex;
    gap: spacing('3xs');
    align-items: baseline;
    color: color('text-muted');

    small {
      color: color('text-faint');
    }
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

    &--neutral,
    &--muted {
      background-color: color('text-faint');
    }
  }

  &__bar-count {
    text-align: right;

    @include numeric;
  }

  &__tone--danger {
    color: color('danger');
  }

  &__tone--success {
    color: color('success');
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
