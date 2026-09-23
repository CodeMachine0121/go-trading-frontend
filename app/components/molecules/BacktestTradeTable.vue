<script setup lang="ts">
import AppButton from '~/components/atoms/AppButton.vue'
import type { ClosedTradeDto } from '~/domain/models/dto/closed-trade-dto'
import type { TimeZoneDto } from '~/domain/models/dto/time-zone-dto'

// 分子：交易明細，一筆一列。
//
// 「一筆都沒有」由這裡明講，而不是留一張空表格：空白讓人以為壞了，
// 明講讓人知道是策略腳本沒開口。
// 那兩欄成本收過錢才畫，而「有沒有收過錢」由外面告訴它——不是讓表格自己
// 去看每一列的成本是不是零。一筆成本為零的交易不代表整次重演沒收過錢，
// 而表格一旦開始判斷這種事，它就變成了第二個知道業務規則的地方。
const {
  closedTrades,
  timeZone,
  showTransactionCosts = false,
  hasOpenPosition = false,
  showContractFigures = false,
} = defineProps<{
  closedTrades: readonly ClosedTradeDto[]
  timeZone: TimeZoneDto
  showTransactionCosts?: boolean
  /**
   * 結束時還抱著一注沒平。
   *
   * 它決定空表格要說哪一句話，而**它由外面告訴這張表**——
   * 「開倉次數大於已平倉筆數就是還抱著」靠的是一條領域規則
   * （同一時間最多一個部位），不該由表格自己推。
   */
  hasOpenPosition?: boolean
  /** 這一次是合約重演：每一筆多出槓桿、數量、保證金與資金費用。 */
  showContractFigures?: boolean
}>()

/**
 * 一次顯示幾筆。一次重演可能有上千筆交易，一口氣畫出來會讓整頁卡住；
 * 分批顯示，要看更多的人按一下就有。
 */
const TRADE_BATCH_SIZE = 200

const shownTradeCount = ref(TRADE_BATCH_SIZE)
const shownTrades = computed(() => closedTrades.slice(0, shownTradeCount.value))

// 換了一次結果就從第一批重新開始：上一次按出來的筆數與這一份無關。
watch(() => closedTrades, () => {
  shownTradeCount.value = TRADE_BATCH_SIZE
})
</script>

<template>
  <!--
    空表格有兩個完全不同的原因，而它們需要兩句不同的話。
    一支每一棒都說買入的算式會開一注抱到最後：那一注沒有出場，所以不在明細裡——
    但說它「沒有觸發任何交易」是錯的，而那句附帶的理由（「算式可以從頭到尾都說持平」）
    還會把人推去懷疑一個沒有問題的地方。
  -->
  <p
    v-if="closedTrades.length === 0 && hasOpenPosition"
    class="backtest-trade-table__empty"
    data-testid="no-closed-trades-yet"
  >
    <!--
      指路只能指向畫面上真的有的那一格：沒收過錢的那一次重演，
      成績單上根本沒有「交易成本」，叫人去看它等於叫人去找一個不存在的東西。
      三元寫在插值裡而不是拆成兩行文字——文字節點裡的換行會渲染成一個空格。
    -->
    {{ showTransactionCosts
      ? '開了倉但還沒平掉，所以這張明細是空的。那一注的市值算進了「最後剩多少」，已付的進場成本算進了「交易成本」——只有還沒發生的出場成本沒算。'
      : '開了倉但還沒平掉，所以這張明細是空的。那一注的市值算進了「最後剩多少」，用最後一棒的收盤價估。' }}
  </p>

  <p
    v-else-if="closedTrades.length === 0"
    class="backtest-trade-table__empty"
    data-testid="no-trades"
  >
    這段期間沒有觸發任何交易。算式可以從頭到尾都說持平，這不算失敗。
  </p>

  <div
    v-if="closedTrades.length > 0"
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
          <!-- 合約那四欄擺在價格之後：先看它借了幾倍、押了多少，再看它怎麼結束。 -->
          <th
            v-if="showContractFigures"
            scope="col"
          >
            槓桿
          </th>
          <th
            v-if="showContractFigures"
            scope="col"
          >
            數量
          </th>
          <th
            v-if="showContractFigures"
            scope="col"
          >
            保證金
          </th>
          <th
            v-if="showContractFigures"
            scope="col"
          >
            資金費用
          </th>
          <!-- 擺在出場價之後、賺賠之前：它說的是**那一次出場**的事。 -->
          <th scope="col">
            怎麼出場
          </th>
          <!-- 擺在賺賠之前：先看付了多少，再看剩下多少。 -->
          <th
            v-if="showTransactionCosts"
            scope="col"
          >
            進場成本
          </th>
          <th
            v-if="showTransactionCosts"
            scope="col"
          >
            出場成本
          </th>
          <!-- 說明它是淨額，否則有人會拿進出場價自己心算然後對不起來。 -->
          <th scope="col">
            {{ showTransactionCosts ? '賺賠（已扣成本）' : '賺賠' }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(closedTrade, index) in shownTrades"
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
          <template v-if="showContractFigures && closedTrade.contract">
            <td data-testid="trade-leverage">
              {{ closedTrade.contract.leverageLabel }}
            </td>
            <td
              class="backtest-trade-table__number"
              data-testid="trade-quantity"
            >
              {{ closedTrade.contract.quantity }}
            </td>
            <td
              class="backtest-trade-table__number"
              data-testid="trade-margin"
            >
              {{ closedTrade.contract.margin }}
            </td>
            <td
              class="backtest-trade-table__number"
              data-testid="trade-funding-fee"
            >
              {{ closedTrade.contract.fundingFee }}
            </td>
          </template>
          <td data-testid="trade-exit-reason">
            {{ closedTrade.exitReasonLabel }}
          </td>
          <td
            v-if="showTransactionCosts"
            class="backtest-trade-table__number"
            data-testid="trade-entry-cost"
          >
            {{ closedTrade.entryCost }}
          </td>
          <td
            v-if="showTransactionCosts"
            class="backtest-trade-table__number"
            data-testid="trade-exit-cost"
          >
            {{ closedTrade.exitCost }}
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

  <div
    v-if="closedTrades.length > TRADE_BATCH_SIZE"
    class="backtest-trade-table__more"
  >
    <span data-testid="shown-trade-count">
      顯示 {{ shownTrades.length }} 筆，共 {{ closedTrades.length }} 筆
    </span>
    <AppButton
      v-if="shownTrades.length < closedTrades.length"
      type="button"
      variant="secondary"
      size="small"
      data-testid="show-more-trades-button"
      @click="shownTradeCount += TRADE_BATCH_SIZE"
    >
      再顯示更多
    </AppButton>
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

  &__more {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: spacing('sm');
    margin-top: spacing('sm');
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
