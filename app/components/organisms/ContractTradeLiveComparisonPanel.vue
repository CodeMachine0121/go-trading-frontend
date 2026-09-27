<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppSelect from '~/components/atoms/AppSelect.vue'
import FormField from '~/components/molecules/FormField.vue'
import type { ContractTradeLiveComparisonDto } from '~/domain/models/dto/contract-trade-live-comparison-dto'
import type { TradingStrategyDto } from '~/domain/models/dto/trading-strategy-dto'

const { tradingStrategies, comparison = null, replaying = false, failureMessage = null } = defineProps<{
  tradingStrategies: readonly TradingStrategyDto[]
  comparison?: ContractTradeLiveComparisonDto | null
  replaying?: boolean
  failureMessage?: string | null
}>()

const selectedTradingStrategyId = defineModel<number | null>('selectedTradingStrategyId', { required: true })

const selectedValue = computed({
  get: () => selectedTradingStrategyId.value === null ? '' : String(selectedTradingStrategyId.value),
  set: (value: string) => {
    selectedTradingStrategyId.value = value === '' ? null : Number(value)
  },
})
</script>

<template>
  <AppPanel title="實盤 vs 回測">
    <div class="contract-trade-live-comparison-panel">
      <FormField
        label="合約交易策略"
        hint="以這份策略、同一個標的、實單涵蓋的那段期間重演一次，並排比較。"
      >
        <AppSelect
          v-model="selectedValue"
          data-testid="comparison-strategy"
        >
          <option value="">
            挑一份合約交易策略
          </option>
          <option
            v-for="tradingStrategy in tradingStrategies"
            :key="tradingStrategy.id"
            :value="String(tradingStrategy.id)"
          >
            {{ tradingStrategy.name }}
          </option>
        </AppSelect>
      </FormField>

      <p
        v-if="replaying"
        class="contract-trade-live-comparison-panel__state"
        data-testid="comparison-replaying"
      >
        重演中…
      </p>

      <AppAlert
        v-else-if="failureMessage"
        tone="danger"
        data-testid="comparison-failure"
      >
        {{ failureMessage }}
      </AppAlert>

      <template v-else-if="comparison">
        <p
          v-if="comparison.notice"
          class="contract-trade-live-comparison-panel__state"
          data-testid="comparison-notice"
        >
          {{ comparison.notice }}
        </p>
        <div
          v-if="comparison.rows.length > 0"
          class="contract-trade-live-comparison-panel__scroller"
        >
          <table
            class="contract-trade-live-comparison-panel__table"
            data-testid="comparison-table"
          >
            <thead>
              <tr>
                <th>標的</th>
                <th>回測勝率</th>
                <th>實盤勝率</th>
                <th>回測筆數</th>
                <th>實盤筆數</th>
                <th>回測 做多／做空</th>
                <th>實盤 做多／做空</th>
                <th>判讀</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in comparison.rows"
                :key="row.symbol"
                :data-testid="`comparison-row-${row.symbol}`"
              >
                <td>{{ row.symbol }}</td>
                <template v-if="row.backtest">
                  <td>{{ row.backtest.winRateText }}</td>
                  <td :class="`contract-trade-live-comparison-panel__tone--${row.liveWinRateTone}`">
                    {{ row.live.winRateText }}
                  </td>
                  <td>{{ row.backtest.closedTradeCountText }}</td>
                  <td>{{ row.live.closedTradeCountText }}</td>
                  <td>{{ row.backtest.longWinRateText }}／{{ row.backtest.shortWinRateText }}</td>
                  <td>{{ row.live.longWinRateText }}／{{ row.live.shortWinRateText }}</td>
                </template>
                <template v-else>
                  <td class="contract-trade-live-comparison-panel__unavailable">
                    {{ row.backtestUnavailableMessage }}
                  </td>
                  <td>{{ row.live.winRateText }}</td>
                  <td>—</td>
                  <td>{{ row.live.closedTradeCountText }}</td>
                  <td>—</td>
                  <td>{{ row.live.longWinRateText }}／{{ row.live.shortWinRateText }}</td>
                </template>
                <td>
                  <AppBadge
                    :variant="row.verdictTone"
                    :data-testid="`comparison-verdict-${row.symbol}`"
                  >
                    {{ row.verdictLabel }}
                  </AppBadge>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>
  </AppPanel>
</template>

<style scoped lang="scss">
.contract-trade-live-comparison-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__state {
    margin: 0;
    color: color('text-faint');
    font-size: font-size('sm');
  }

  &__scroller {
    overflow-x: auto;
  }

  &__table {
    @include time-series-table;

    td.contract-trade-live-comparison-panel__tone--danger {
      color: color('danger');
    }

    td.contract-trade-live-comparison-panel__unavailable {
      color: color('text-muted');
      text-align: left;
    }
  }
}
</style>
