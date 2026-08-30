<script setup lang="ts">
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import { formatUtcDateTime } from '~/utilities/utc-time-format'

// 有機體：把一次查詢的結果攤成表格。
// 筆數、排序、漲跌語氣都已經在 DTO 裡算好，這裡只負責呈現。
defineProps<{ result: KCandleSearchResultDto }>()
</script>

<template>
  <section class="k-candle-table">
    <header class="k-candle-table__header">
      <h2 class="k-candle-table__title">
        查詢結果
      </h2>
      <p
        class="k-candle-table__count"
        data-testid="result-count"
      >
        共 {{ result.count }} 根
      </p>
    </header>

    <p
      v-if="result.isEmpty"
      class="k-candle-table__empty"
      data-testid="empty-result"
    >
      查無 K 線。這段區間內可能還沒有資料，或交易標的名稱與後端不同。
    </p>

    <div
      v-else
      class="k-candle-table__scroller"
    >
      <table class="k-candle-table__table">
        <thead>
          <tr>
            <th scope="col">
              起始時間（UTC）
            </th>
            <th scope="col">
              漲跌
            </th>
            <th scope="col">
              開盤價
            </th>
            <th scope="col">
              最高價
            </th>
            <th scope="col">
              最低價
            </th>
            <th scope="col">
              收盤價
            </th>
            <th scope="col">
              成交量
            </th>
            <th scope="col">
              成交額
            </th>
            <th scope="col">
              主動買入量
            </th>
            <th scope="col">
              主動買入額
            </th>
            <th
              v-if="$slots['row-actions']"
              scope="col"
            >
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="kCandle in result.kCandles"
            :key="kCandle.openTime.toISOString()"
            data-testid="k-candle-row"
          >
            <td>{{ formatUtcDateTime(kCandle.openTime) }}</td>
            <td>
              <AppBadge :variant="kCandle.trend.tone">
                {{ kCandle.trend.label }}
              </AppBadge>
            </td>
            <td>{{ kCandle.open.toString() }}</td>
            <td>{{ kCandle.high.toString() }}</td>
            <td>{{ kCandle.low.toString() }}</td>
            <td>{{ kCandle.close.toString() }}</td>
            <td>{{ kCandle.volume.toString() }}</td>
            <td>{{ kCandle.quoteVolume.toString() }}</td>
            <td>{{ kCandle.takerBuyBaseVolume.toString() }}</td>
            <td>{{ kCandle.takerBuyQuoteVolume.toString() }}</td>
            <td v-if="$slots['row-actions']">
              <slot
                name="row-actions"
                :k-candle="kCandle"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped lang="scss">
.k-candle-table {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__header {
    display: flex;
    gap: spacing('md');
    align-items: baseline;
    justify-content: space-between;
  }

  &__title {
    margin: 0;
  }

  &__count {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__empty {
    margin: 0;
    border: 1px dashed color('border');
    border-radius: radius('md');
    padding: spacing('lg');
    color: color('text-muted');
    text-align: center;
  }

  &__scroller {
    overflow-x: auto;
    border: 1px solid color('border');
    border-radius: radius('md');
  }

  &__table {
    border-collapse: collapse;
    background-color: color('surface');
    width: 100%;
    font-size: font-size('sm');

    th,
    td {
      border-bottom: 1px solid color('border');
      padding: spacing('xs') spacing('sm');
      text-align: right;
      white-space: nowrap;
    }

    th:first-child,
    td:first-child {
      text-align: left;
    }

    th {
      background-color: color('surface-muted');
      font-weight: font-weight('medium');
    }

    tbody tr:last-child td {
      border-bottom: none;
    }
  }
}
</style>
