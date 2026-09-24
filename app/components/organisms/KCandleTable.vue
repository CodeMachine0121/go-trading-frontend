<script setup lang="ts">
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import type { KCandleDto } from '~/domain/models/dto/k-candle-dto'
import type { KCandleSearchResultDto } from '~/domain/models/dto/k-candle-search-result-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 有機體：把一次查詢的結果攤成表格。
// 筆數、排序、漲跌語氣都已經在 DTO 裡算好，這裡只負責呈現；
// 時間要用哪一個時區說，問選定的那一個。
//
// 還沒查過（`result` 為 null）時它照樣在：表格區是這個畫面的主體，
// 一片空白比一張「還沒查」的空表格更難懂，而且維護 K 線的入口就掛在它的標題列上——
// 那顆按鈕在第一次查詢之前就要按得到。
//
// 查詢列由使用端放進 `query` 插槽，畫在表格正上方：條件與它查出來的結果是同一張卡。
const { selectedKCandle = null, selectable = false } = defineProps<{
  result?: KCandleSearchResultDto | null
  timeZone: TimeZoneDto
  /** 正在維護的那一根：它那一列要標出來，看的人才知道旁邊那張表單在改哪一根。 */
  selectedKCandle?: KCandleDto | null
  /** 點一整列就等於挑它——手機上那一排「編輯」鍵在橫向捲軸的最右邊，拇指構不到。 */
  selectable?: boolean
}>()

const emit = defineEmits<{ select: [KCandleDto] }>()

/**
 * 這個市場不報這個數字時，那一格畫的東西。
 *
 * 刻意不是 `0`：零是「這一分鐘沒有成交」，是一個真的讀數。兩者長得一樣的話，
 * 看的人沒有任何辦法分辨，而且不會有任何地方報錯。
 */
const ABSENT_FIGURE = '—'

function isSelected(kCandle: KCandleDto): boolean {
  return selectedKCandle !== null && selectedKCandle.openTime.getTime() === kCandle.openTime.getTime()
}

function selectRow(kCandle: KCandleDto) {
  if (selectable) {
    emit('select', kCandle)
  }
}
</script>

<template>
  <AppPanel
    title="查詢結果"
    flush
    class="k-candle-table"
  >
    <template
      v-if="result"
      #meta
    >
      <span data-testid="result-count">共 {{ result.count }} 根</span>
    </template>

    <template
      v-if="$slots.actions"
      #actions
    >
      <slot name="actions" />
    </template>

    <div
      v-if="$slots.query"
      class="k-candle-table__query"
    >
      <slot name="query" />
    </div>

    <p
      v-if="!result"
      class="k-candle-table__placeholder"
      data-testid="idle-result"
    >
      填好上面的條件按「查詢」，查到的 K 線會列在這裡。
    </p>

    <p
      v-else-if="result.isEmpty"
      class="k-candle-table__placeholder"
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
              <!-- 標城市名而不是位移：每一列的位移是那一列那個瞬間的，
                   一個「現在的」位移會在日光節約時間前後對不上自己底下的列 -->
              起始時間（{{ timeZone.cityLabel }}）
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
            class="k-candle-table__row"
            :class="{
              'k-candle-table__row--selected': isSelected(kCandle),
              'k-candle-table__row--selectable': selectable,
            }"
            :aria-selected="selectable ? isSelected(kCandle) : undefined"
            data-testid="k-candle-row"
            @click="selectRow(kCandle)"
          >
            <td>
              {{ timeZone.formatDateTime(kCandle.openTime) }}
            </td>
            <td>
              <AppBadge :variant="kCandle.trend.tone">
                {{ kCandle.trend.label }}
              </AppBadge>
            </td>
            <td>{{ kCandle.open.toString() }}</td>
            <td>{{ kCandle.high.toString() }}</td>
            <td>{{ kCandle.low.toString() }}</td>
            <!-- 收盤價帶著這一根的漲跌語氣：一整欄往下讀，紅綠就是走勢。 -->
            <td :class="`k-candle-table__close--${kCandle.trend.tone}`">
              {{ kCandle.close.toString() }}
            </td>
            <td>{{ kCandle.volume.toString() }}</td>
            <!--
              這三格可能根本沒有值——不是每個市場都報這些數字。畫成 0 會讓
              「這個市場不報它」與「這一分鐘沒有成交」長得一模一樣，而看的人
              沒有任何辦法分辨。所以沒有值畫成一個破折號並淡化。
            -->
            <td :class="{ 'k-candle-table__absent': kCandle.quoteVolume === null }">
              {{ kCandle.quoteVolume?.toString() ?? ABSENT_FIGURE }}
            </td>
            <td :class="{ 'k-candle-table__absent': kCandle.takerBuyBaseVolume === null }">
              {{ kCandle.takerBuyBaseVolume?.toString() ?? ABSENT_FIGURE }}
            </td>
            <td :class="{ 'k-candle-table__absent': kCandle.takerBuyQuoteVolume === null }">
              {{ kCandle.takerBuyQuoteVolume?.toString() ?? ABSENT_FIGURE }}
            </td>
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
  </AppPanel>
</template>

<style scoped lang="scss">
.k-candle-table {
  // 表格是這個畫面的主體，剩下的高度全部給它；資料再多也在自己的框裡捲。
  flex: 1;
  min-height: 18rem;

  // 查詢列：卡片頂端的一條窄帶，與底下的表格以一條髮絲線分開。
  &__query {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: spacing('xs');
    border-bottom: 1px solid color('border');
    padding: spacing('sm');
  }

  &__placeholder {
    margin: auto;
    padding: spacing('2xl') spacing('md');
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }

  &__scroller {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  // 時間釘在左邊、數字往右排的那一種表，與另一張 K 線表同一把尺。
  //
  // 下面幾條必須住在 &__table 裡面：表格那條 `td` 的顏色比單一個 class 更明確，
  // 擺在外面的話它會被蓋掉，而且不會有任何錯誤提醒你。
  &__table {
    @include time-series-table;

    // 沒有值的那一格：淡化，讓它與旁邊真的是 0 的數字一眼分得開。
    td.k-candle-table__absent {
      color: color('text-faint');
    }

    td.k-candle-table__close--success {
      color: color('success');
    }

    td.k-candle-table__close--danger {
      color: color('danger');
    }

    .k-candle-table__row--selectable {
      cursor: pointer;
    }

    // 正在維護的那一列：整列鋪一層強調色，最左邊一道實線。
    //
    // 那層色是半透明的，所以鋪成一張疊在底色上的「圖」而不是換掉底色：
    // 釘住的時間格仍然保有自己不透明的底，橫向捲過去的數字不會從它底下透出來；
    // 滑鼠停在上面時底色照常換，那層強調色也照樣在。
    .k-candle-table__row--selected td {
      background-image: linear-gradient(color('primary-soft'), color('primary-soft'));
    }

    .k-candle-table__row--selected td:first-child {
      box-shadow: inset 2px 0 0 color('primary');
      color: color('text-strong');
    }
  }
}
</style>
