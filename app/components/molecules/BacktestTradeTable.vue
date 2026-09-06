<script setup lang="ts">
import type { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：交易明細，一筆一列。
//
// 「一筆都沒有」由這裡明講，而不是留一張空表格：空白讓人以為壞了，
// 明講讓人知道是策略沒開口。
const { closedTrades, timeZone } = defineProps<{
  closedTrades: readonly ClosedTradeDto[]
  timeZone: TimeZoneDto
}>()
</script>

<template>
  <p
    v-if="closedTrades.length === 0"
    class="backtest-trade-table__empty"
    data-testid="no-trades"
  >
    這段期間沒有觸發任何交易。算式可以從頭到尾都說持平，這不算失敗。
  </p>

  <div
    v-else
    class="backtest-trade-table__scroller"
  >
    <table class="backtest-trade-table">
      <thead>
        <tr>
          <th scope="col">
            方向
          </th>
          <th scope="col">
            進場（{{ timeZone.cityLabel }}）
          </th>
          <th scope="col">
            進場價
          </th>
          <th scope="col">
            出場（{{ timeZone.cityLabel }}）
          </th>
          <th scope="col">
            出場價
          </th>
          <th scope="col">
            賺賠
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(closedTrade, index) in closedTrades"
          :key="index"
          data-testid="trade-row"
        >
          <td>{{ closedTrade.directionLabel }}</td>
          <td>{{ timeZone.formatDateTime(closedTrade.entryTime) }}</td>
          <td class="backtest-trade-table__number">
            {{ closedTrade.entryPrice }}
          </td>
          <td>{{ timeZone.formatDateTime(closedTrade.exitTime) }}</td>
          <td class="backtest-trade-table__number">
            {{ closedTrade.exitPrice }}
          </td>
          <!-- 賺綠賠紅：同一欄裡掃下去，方向比數值先被看見。 -->
          <td
            class="backtest-trade-table__number"
            :class="`backtest-trade-table__profit--${closedTrade.profitTone}`"
            data-testid="trade-profit"
          >
            {{ closedTrade.profit }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped lang="scss">
.backtest-trade-table {
  border-collapse: collapse;
  width: 100%;
  font-size: font-size('sm');

  &__empty {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  // 明細可能有幾十列，橫向也可能塞不下：讓它自己捲，不要把整頁撐寬。
  &__scroller {
    overflow-x: auto;
  }

  th,
  td {
    border-bottom: 1px solid color('border');
    padding: spacing('2xs') spacing('xs');
    text-align: left;
    white-space: nowrap;
  }

  th {
    @include dense-label;
  }

  td {
    color: color('text');
  }

  &__number {
    text-align: right;

    @include numeric;
  }

  &__profit {
    &--positive {
      color: color('success');
    }

    &--negative {
      color: color('danger');
    }

    &--neutral {
      color: color('text-muted');
    }
  }
}
</style>
