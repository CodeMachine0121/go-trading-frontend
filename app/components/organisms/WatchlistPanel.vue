<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import WatchlistEntryForm from '~/components/molecules/WatchlistEntryForm.vue'
import type { WatchlistApplication } from '~/application/watchlist-application'
import type { TradingSymbolDto } from '~/domain/models/dto/trading-symbol-dto'
import type { WatchlistEntryDto } from '~/domain/models/dto/watchlist-entry-dto'
import { MarketDataSourceUnavailableError } from '~/domain/errors/market-data-source-unavailable-error'
import { TradingSymbolNotInMarketError } from '~/domain/errors/trading-symbol-not-in-market-error'

/**
 * 有機體：觀察清單這一頁的全部。
 *
 * 它只認識一個 application——列出、加入、移除三件事都從那裡走，
 * 頁面不必自己把它們排起來。
 */
const { watchlistApplication } = defineProps<{
  watchlistApplication: WatchlistApplication
}>()

const watchedTradingSymbols = ref<TradingSymbolDto[]>([])
const loading = ref(true)
const unavailable = ref(false)
const submitting = ref(false)
/** 加入失敗的原因。它就地標在代號旁邊，讓使用者當場改一個字再送一次。 */
const addFailure = ref<string | null>(null)
/** 使用者打在加入那一格裡的代號。加成功了才清掉它——失敗時他還要看著它改。 */
const entrySymbol = ref('')
const removeFailure = ref<string | null>(null)
const removingSymbol = ref<string | null>(null)

async function reload() {
  try {
    watchedTradingSymbols.value = await watchlistApplication.listWatchedTradingSymbols()
    unavailable.value = false
  }
  catch {
    // 取不到清單不是使用者能修正的事——說明它取不到，而不是說「目前沒有追蹤任何標的」。
    // 那兩句話對他的意思完全不同：一句要他去把後端啟動起來，一句要他加一檔進來。
    unavailable.value = true
  }
  finally {
    loading.value = false
  }
}

async function add(entry: WatchlistEntryDto) {
  submitting.value = true
  addFailure.value = null

  try {
    await watchlistApplication.addToWatchlist(entry)
    // 成功了才清掉那一格。失敗時他還要看著自己打的東西改。
    entrySymbol.value = ''
    await reload()
  }
  catch (error: unknown) {
    // 三句不同的話。前兩種對使用者的下一步完全相反：一個改輸入，一個等一下再試。
    if (error instanceof TradingSymbolNotInMarketError) {
      addFailure.value = `這個代號在所選的市場找不到，請確認之後再送出。（${error.message}）`
    }
    else if (error instanceof MarketDataSourceUnavailableError) {
      addFailure.value = '目前問不到那個市場，請稍後再試。這與代號對不對無關。'
    }
    else {
      addFailure.value = error instanceof Error ? error.message : '加入失敗'
    }
  }
  finally {
    submitting.value = false
  }
}

async function confirmRemove(symbol: string) {
  removingSymbol.value = null
  removeFailure.value = null

  try {
    await watchlistApplication.removeFromWatchlist(symbol)
    await reload()
  }
  catch (error: unknown) {
    // 拿不掉就要說。不說的話，剛按過「停止追蹤」的那一列還好端端待在清單上，
    // 看的人只會再按一次，然後再一次。
    removeFailure.value = error instanceof Error
      ? `拿不掉這一檔：${error.message}`
      : '拿不掉這一檔。'
  }
}

onMounted(reload)
</script>

<template>
  <section class="watchlist-panel">
    <AppPanel title="要持續追蹤哪幾檔">
      <!--
        常駐說明，不是提示訊息：改動不會立刻生效這件事，任何時候看這一頁的人都需要知道。
        刻意不顯示倒數——後端沒有告訴畫面下一輪何時到，算出來的數字會是編的。
      -->
      <p class="watchlist-panel__note">
        清單改完最多等一輪（五分鐘）才生效，不必重新啟動後端。
      </p>

      <WatchlistEntryForm
        v-model:symbol="entrySymbol"
        :submitting="submitting"
        :error-message="addFailure"
        @add="add"
      />
    </AppPanel>

    <AppPanel title="追蹤中">
      <!--
        拿不掉的說明放在清單這一塊，不放在加入那一塊：它說的是這份清單怎麼了，
        而看的人正盯著那一列還在那裡。
      -->
      <AppAlert
        v-if="removeFailure"
        tone="danger"
        data-testid="watchlist-remove-failure-alert"
      >
        {{ removeFailure }}
      </AppAlert>

      <AppAlert
        v-if="unavailable"
        tone="danger"
        data-testid="watchlist-unavailable-alert"
      >
        取不到觀察清單，請確認後端已啟動。
      </AppAlert>

      <p
        v-else-if="loading"
        class="watchlist-panel__placeholder"
      >
        取觀察清單中…
      </p>

      <p
        v-else-if="watchedTradingSymbols.length === 0"
        class="watchlist-panel__placeholder"
        data-testid="watchlist-empty"
      >
        目前沒有任何追蹤中的交易標的。加一檔進來，下一輪就會開始抓它的 K 線。
      </p>

      <ul
        v-else
        class="watchlist-panel__list"
      >
        <li
          v-for="tradingSymbol in watchedTradingSymbols"
          :key="tradingSymbol.symbol"
          class="watchlist-panel__item"
        >
          <span class="watchlist-panel__symbol">{{ tradingSymbol.label }}</span>
          <AppBadge tone="neutral">
            {{ tradingSymbol.market.label }}
          </AppBadge>
          <AppBadge :tone="tradingSymbol.liveUpdateAvailability.tone">
            {{ tradingSymbol.liveUpdateAvailability.label }}
          </AppBadge>
          <AppButton
            variant="danger"
            :data-testid="`watchlist-remove-${tradingSymbol.symbol}`"
            @click="removingSymbol = tradingSymbol.symbol"
          >
            移除
          </AppButton>
        </li>
      </ul>
    </AppPanel>

    <!--
      「移除」在直覺上很接近「刪除」，所以確認訊息必須說出資料會留著——
      不講清楚，使用者不敢按；講清楚了，按下去就不必猶豫。
    -->
    <ConfirmDialog
      v-if="removingSymbol !== null"
      open
      title="停止追蹤這一檔？"
      :message="`停止追蹤 ${removingSymbol} 之後就不再自動抓它的 K 線。`
        + '已經抓回來的 K 線都會留著，查詢、圖表與回測照常。'"
      confirm-label="停止追蹤"
      variant="danger"
      @confirm="confirmRemove(removingSymbol)"
      @cancel="removingSymbol = null"
    />
  </section>
</template>

<style scoped lang="scss">
.watchlist-panel {
  display: flex;
  flex-direction: column;
  gap: spacing('md');

  &__note {
    margin: 0 0 spacing('sm');
    color: color('text-faint');
    font-size: font-size('2xs');
  }

  &__placeholder {
    margin: 0;
    padding: spacing('lg') 0;
    color: color('text-faint');
    font-size: font-size('xs');
    text-align: center;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: spacing('sm');
  }

  &__symbol {
    flex: 1;
    font-size: font-size('sm');
  }
}
</style>
