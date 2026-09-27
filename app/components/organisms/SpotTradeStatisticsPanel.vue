<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import TradeSummaryStrip from '~/components/molecules/TradeSummaryStrip.vue'
import TradeCumulativeChart from '~/components/molecules/TradeCumulativeChart.vue'
import type { SpotTradeStatisticsDto } from '~/domain/models/dto/spot-trade-statistics-dto'
import type { JournalOptionDto } from '~/domain/models/dto/journal-option-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'
import type { TradeStatisticsPeriod } from '~/domain/models/vo/trade-statistics-period-vo'

const { statistics = null, loading = false, failureMessage = null, periodOptions, timeZone } = defineProps<{
  statistics?: SpotTradeStatisticsDto | null
  loading?: boolean
  failureMessage?: string | null
  periodOptions: readonly JournalOptionDto[]
  timeZone: TimeZoneDto
}>()

const period = defineModel<TradeStatisticsPeriod>('period', { required: true })

const periodTab = computed({
  get: () => period.value,
  set: (value: string) => {
    period.value = value as TradeStatisticsPeriod
  },
})
</script>

<template>
  <div class="spot-trade-statistics-panel">
    <header class="spot-trade-statistics-panel__header">
      <p
        v-if="statistics"
        class="spot-trade-statistics-panel__headline"
        data-testid="statistics-headline"
      >
        {{ statistics.periodLabel }}・台股與加密貨幣分開計算，金額不跨幣別加總
      </p>
      <AppTabs
        v-model="periodTab"
        :options="periodOptions"
        variant="segmented"
        data-testid="statistics-period"
      />
    </header>

    <p
      v-if="loading && !statistics"
      class="spot-trade-statistics-panel__state"
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
      <section
        v-for="market in statistics.markets"
        :key="market.marketLabel"
        class="spot-trade-statistics-panel__market"
        :data-testid="`statistics-market-${market.marketLabel}`"
      >
        <h3 class="spot-trade-statistics-panel__market-label">
          {{ market.marketLabel }}・{{ market.closedTradeCountText }}
        </h3>
        <p
          v-if="market.emptyMessage"
          class="spot-trade-statistics-panel__state"
          data-testid="statistics-empty"
        >
          {{ market.emptyMessage }}
        </p>
        <template v-else>
          <TradeSummaryStrip :figures="market.figures" />
          <p
            v-if="market.rMultipleNote"
            class="spot-trade-statistics-panel__note"
            data-testid="statistics-r-note"
          >
            {{ market.rMultipleNote }}
          </p>
          <div class="spot-trade-statistics-panel__grid">
            <AppPanel title="累積損益">
              <template
                v-if="market.totalProfit"
                #actions
              >
                <span
                  class="spot-trade-statistics-panel__total"
                  :class="`spot-trade-statistics-panel__total--${market.totalProfit.tone}`"
                  data-testid="statistics-total-profit"
                >{{ market.totalProfit.text }}</span>
              </template>
              <TradeCumulativeChart
                :points="market.cumulativePoints"
                :time-zone="timeZone"
              />
            </AppPanel>
            <AppPanel title="報酬率分布">
              <ul
                class="spot-trade-statistics-panel__histogram"
                data-testid="return-distribution"
              >
                <li
                  v-for="bar in market.distribution"
                  :key="bar.label"
                  class="spot-trade-statistics-panel__column"
                >
                  <span class="spot-trade-statistics-panel__bar-count">{{ bar.count }}</span>
                  <span class="spot-trade-statistics-panel__column-track">
                    <span
                      class="spot-trade-statistics-panel__column-bar"
                      :class="`spot-trade-statistics-panel__bar--${bar.tone}`"
                      :style="{ height: `${bar.widthPercentage}%` }"
                    />
                  </span>
                  <span class="spot-trade-statistics-panel__bar-label">{{ bar.label }}</span>
                </li>
              </ul>
            </AppPanel>
            <AppPanel title="失誤花了你多少">
              <p
                v-if="market.mistakeCosts.length === 0"
                class="spot-trade-statistics-panel__state"
              >
                這段期間沒有貼失誤標籤的交易
              </p>
              <ul
                v-else
                class="spot-trade-statistics-panel__bars"
                data-testid="mistake-costs"
              >
                <li
                  v-for="mistakeCost in market.mistakeCosts"
                  :key="mistakeCost.tagName"
                  class="spot-trade-statistics-panel__bar-row"
                >
                  <span class="spot-trade-statistics-panel__bar-label">{{ mistakeCost.tagName }}<small>{{ mistakeCost.tradeCountText }}</small></span>
                  <span class="spot-trade-statistics-panel__track">
                    <span
                      class="spot-trade-statistics-panel__bar"
                      :class="`spot-trade-statistics-panel__bar--${mistakeCost.tone}`"
                      :style="{ width: `${mistakeCost.widthPercentage}%` }"
                    />
                  </span>
                  <span
                    class="spot-trade-statistics-panel__bar-count"
                    :class="`spot-trade-statistics-panel__tone--${mistakeCost.tone}`"
                  >{{ mistakeCost.totalNetProfitText }}<small>{{ mistakeCost.averageReturnRateText }}</small></span>
                </li>
              </ul>
            </AppPanel>
            <AppPanel title="有關聯策略 vs 自行判斷">
              <table
                class="spot-trade-statistics-panel__table"
                data-testid="source-comparison"
              >
                <thead>
                  <tr>
                    <th>來源</th>
                    <th>筆數</th>
                    <th>勝率</th>
                    <th>平均報酬率</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in market.sourceComparison"
                    :key="row.label"
                  >
                    <td>{{ row.label }}</td>
                    <td>{{ row.tradeCountText }}</td>
                    <td>{{ row.winRateText }}</td>
                    <td>{{ row.averageReturnRateText }}</td>
                  </tr>
                </tbody>
              </table>
            </AppPanel>
          </div>
        </template>
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.spot-trade-statistics-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

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

  &__market {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');
  }

  &__market-label {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('sm');
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

  &__grid {
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
    grid-template-columns: 7rem minmax(0, 1fr) 7rem;
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
    display: flex;
    flex-direction: column;
    text-align: right;

    @include numeric;

    small {
      color: color('text-faint');
    }
  }

  &__tone--danger {
    color: color('danger');
  }

  &__tone--success {
    color: color('success');
  }

  &__table {
    @include time-series-table;
  }
}
</style>
