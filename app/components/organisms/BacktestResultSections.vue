<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import BacktestEquityCurveChart from '~/components/molecules/BacktestEquityCurveChart.vue'
import BacktestSummaryCard from '~/components/molecules/BacktestSummaryCard.vue'
import BacktestTradeTable from '~/components/molecules/BacktestTradeTable.vue'
import type { BacktestResultDto } from '~/domain/models/dto/backtest-result-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：一次回測的結果，一塊一塊畫出來。
//
// 畫成哪幾塊、哪一塊排第一、哪一塊要醒目都已經在 DTO 裡決定好了——
// 沒有驗證起點時只有一塊、沒有標題，畫出來與這個功能出現以前一模一樣。
// 四個回測去處都用它，所以「成績單、曲線、明細」三個面板只寫這一份。
const { result, timeZone } = defineProps<{
  result: BacktestResultDto
  timeZone: TimeZoneDto
}>()
</script>

<template>
  <div class="backtest-result-sections">
    <section
      v-for="section in result.sections"
      :key="section.kind"
      class="backtest-result-sections__section"
      :class="{ 'backtest-result-sections__section--emphasized': section.emphasized }"
      :data-testid="`backtest-result-section-${section.kind}`"
    >
      <header
        v-if="section.title"
        class="backtest-result-sections__header"
      >
        <h3 class="backtest-result-sections__title">
          {{ section.title }}
          <AppBadge
            v-if="section.emphasized"
            variant="success"
          >
            以它為準
          </AppBadge>
        </h3>
        <p
          class="backtest-result-sections__note"
          :data-testid="`backtest-result-section-${section.kind}-note`"
        >
          {{ section.note }}
        </p>
        <p class="backtest-result-sections__range">
          {{ timeZone.formatDateTime(section.startTime) }} – {{ timeZone.formatDateTime(section.endTime) }}（{{ timeZone.cityLabel }}）
        </p>
      </header>

      <!-- 三塊東西一起出現：成績單說結論，曲線說形狀，明細說每一筆。 -->
      <AppPanel title="成績單">
        <template #meta>
          <span
            :data-testid="section.title === null
              ? 'backtest-used-candle-count'
              : `backtest-used-candle-count-${section.kind}`"
          >
            回測了 {{ section.usedCandleCount }} 根
            <AppBadge variant="info">
              每根涵蓋 {{ section.intervalLabel }}
            </AppBadge>
          </span>
        </template>

        <BacktestSummaryCard
          :summary="section.summary"
          :time-zone="timeZone"
        />
      </AppPanel>

      <AppPanel
        title="資金曲線"
        flush
      >
        <BacktestEquityCurveChart
          :equity-curve="section.chartEquityCurve"
          :time-zone="timeZone"
        />
      </AppPanel>

      <AppPanel title="交易明細">
        <BacktestTradeTable
          :closed-trades="section.closedTrades"
          :time-zone="timeZone"
          :show-transaction-costs="section.summary.totalTransactionCost !== null"
          :has-open-position="section.summary.hasOpenPosition"
          :show-contract-figures="section.summary.contract !== null"
        />
      </AppPanel>
    </section>
  </div>
</template>

<style scoped lang="scss">
.backtest-result-sections {
  display: flex;
  flex-direction: column;
  gap: spacing('lg');

  &__section {
    display: flex;
    flex-direction: column;
    gap: spacing('sm');

    // 驗證段是唯一回答得了「這支策略有沒有效」的那一塊，所以它要跳出來。
    &--emphasized {
      border: 1px solid color('success');
      border-radius: radius('md');
      padding: spacing('sm');
      background: color('success-soft');
    }
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
  }

  &__title {
    display: flex;
    align-items: center;
    gap: spacing('xs');
    margin: 0;
    color: color('text-strong');
    font-size: font-size('md');
    font-weight: font-weight('semibold');
  }

  &__note,
  &__range {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }
}
</style>
