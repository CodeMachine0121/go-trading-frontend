<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import TradingStrategyWorkbench from '~/components/organisms/TradingStrategyWorkbench.vue'
import { useTradingStrategyWorkbench } from '~/composables/use-trading-strategy-workbench'

definePageMeta({
  layout: 'console',
  consoleTitle: '交易策略',
  consoleSubtitle: '由上往下：先挑訊號來源，再說什麼算買入、什麼算賣出。買入與賣出同時看得見——兩邊都成立的話，照它跑的機器人什麼都不會說。',
})

// 頁面：拼一份新的（`/trading-strategies/new`）與改一份已存的（`/trading-strategies/:id`）
// 共用這一頁，因為那兩件事要做的一模一樣——差別只有「有沒有一份要讀」，
// 而那是一個參數，不是兩個頁面。兩個頁面各寫一次的話，第二個就是那個忘記跟著改的地方。
//
// 連線燈、帳號、時區與現貨／合約開關由 console 版型統一接線。
const NEW_TRADING_STRATEGY = 'new'

const route = useRoute()

/**
 * 網址上那一段讀成「改哪一份」。
 *
 * `new` 是新拼一份（`null`）。解析不出號碼時當作**沒有那一份**，而不是當作新增：
 * `/trading-strategies/abc` 是一條打錯的路，而把它變成一張空白的新表單，
 * 會讓使用者以為自己在改某一份。
 */
const tradingStrategyId = computed(() => {
  const segment = String(route.params.id)
  if (segment === NEW_TRADING_STRATEGY) {
    return null
  }

  const parsed = Number(segment)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
})

const {
  $tradingStrategyApplication,
  $strategyScriptApplication,
  $backtestApplication,
  $tradingSymbolApplication,
} = useNuxtApp()

/**
 * 這一頁有兩個去處：拼規則，與拿歷史問它一次。
 *
 * 打開時停在拼規則，那是這一頁原本就在做的事。切換不清空任何東西——
 * 兩邊都還掛在畫面上，只是其中一邊此刻看得見，所以填到一半的回測條件不會掉。
 */
const WORKBENCH_DESTINATIONS = [
  { value: 'workbench', label: '拼規則' },
  { value: 'backtest', label: '回測' },
] as const

const destination = ref<string>(WORKBENCH_DESTINATIONS[0].value)

const workbench = useTradingStrategyWorkbench(
  $tradingStrategyApplication, $strategyScriptApplication, tradingStrategyId.value)

// 兩份選單描述的是系統的規則，不是這一份的資料，取一次就好。
const marketDataKindOptions = $tradingStrategyApplication.listMarketDataKindOptions()
const contractTradingModeOptions = $tradingStrategyApplication.listContractTradingModeOptions()

onMounted(() => {
  void workbench.load()
})

const TRADING_STRATEGY_LIST = '/trading-strategies'

/**
 * 那一份根本不在了就回清單——這一頁沒有東西可以留。
 *
 * **存好了不在此列**：存好之後最常做的下一件事是回測它，而那個分頁就在這一頁上。
 *
 * 用 watch 而不是在 save 裡直接跳轉：跳轉是這一頁的事，存是那個 composable 的事，
 * 而一個知道怎麼跳轉的 composable 就跟著知道了它被放在哪一條路由底下。
 */
watch(() => workbench.missing.value, (notThere) => {
  if (notThere) {
    void navigateTo(TRADING_STRATEGY_LIST)
  }
})

/**
 * 剛拼好的那一份存下來之後，這一頁從此改的就是它。
 *
 * **這不是修飾**：留在「新拼一份」那條網址上、而表單裡的識別碼還是空的話，
 * 他再按一次儲存就會建出第二份一模一樣的。換過去同時讓重新整理留在那一份上，
 * 也讓回測那一側拿得到識別碼——它在存之前是停用的。
 *
 * 用 replace 而不是 push：那條「新拼一份」的網址已經不再指向任何存在的狀態，
 * 留在上一頁堆疊裡只會讓上一頁變成一個回不去的地方。
 */
watch(() => workbench.createdId.value, (createdId) => {
  if (createdId !== null) {
    void navigateTo(`${TRADING_STRATEGY_LIST}/${createdId}`, { replace: true })
  }
})

const { selectedTimeZone } = useSelectedTimeZone()

// 現在這個寬度代表什麼。這一頁用到的是「步驟卡的設定擺在旁邊，還是從下方拉出」。
const { layoutDensity } = useLayoutDensity()

/**
 * 改到一半想離開就先問過。
 *
 * 巢狀條件是花時間拼出來的，靜靜丟掉太貴。什麼都沒改時不問——
 * 一個每次離開都攔人的頁面，第三次之後就沒有人會讀那句話了。
 */
onBeforeRouteLeave(() => workbench.dirty.value
  ? window.confirm('這一頁改過的東西還沒存，確定要離開嗎？')
  : true)
</script>

<template>
  <div class="trading-strategy-page">
    <p
      v-if="workbench.loading.value"
      class="trading-strategy-page__notice"
      data-testid="workbench-loading"
    >
      讀取中…
    </p>

    <AppAlert
      v-else-if="workbench.missing.value"
      tone="danger"
      data-testid="workbench-missing"
    >
      找不到這一份交易策略，它可能已經被刪掉了。
    </AppAlert>

    <template v-else>
      <AppToast :message="workbench.announcement.value" />

      <!--
        回清單的出口擺在**分頁切換之上**，所以它與現在在哪一個分頁無關：
        剛回測完想回去，與剛存完想回去，是一樣常見的事。
        沒存的改動由這一頁的離開提醒接手，這裡不必自己問一次。
      -->
      <div class="trading-strategy-page__bar">
        <AppButton
          type="button"
          variant="ghost"
          size="small"
          data-testid="back-to-trading-strategies"
          @click="navigateTo(TRADING_STRATEGY_LIST)"
        >
          ← 回交易策略列表
        </AppButton>
        <span class="trading-strategy-page__mode">
          {{ tradingStrategyId === null ? '拼一份交易策略' : '改一改這份交易策略' }}
        </span>

        <!-- 切換擺在工作檯上面：兩個去處問的是同一份規則的兩個問題。 -->
        <AppTabs
          v-model="destination"
          :options="WORKBENCH_DESTINATIONS"
          variant="segmented"
          class="trading-strategy-page__destinations"
        />
      </div>

      <!--
        兩個去處都掛著，只有一個看得見。用 v-show 而不是 v-if，
        是因為填到一半的回測條件與已經算出來的結果都必須留著——
        切過去再切回來，畫面與離開時一樣。
      -->
      <TradingStrategyWorkbench
        v-show="destination === 'workbench'"
        :layout-density="layoutDensity"
        :editing="workbench.editing.value"
        :strategy-script-options-by-kind="workbench.strategyScriptOptionsByKind.value"
        :parameter-names-by-strategy-script-id="workbench.parameterNamesByStrategyScriptId.value"
        :unusable-strategy-scripts-by-kind="workbench.unusableStrategyScriptsByKind.value"
        :shortage-by-kind="workbench.shortageByKind.value"
        :market-data-kind-options="marketDataKindOptions"
        :contract-trading-mode-options="contractTradingModeOptions"
        :saving="workbench.saving.value"
        :failure-message="workbench.failureMessage.value"
        :saved-generation="workbench.savedGeneration.value"
        @save="workbench.save"
        @dirty-change="workbench.markDirty"
      />

      <TradingStrategyBacktestPane
        v-show="destination === 'backtest'"
        :backtest-application="$backtestApplication"
        :trading-symbol-application="$tradingSymbolApplication"
        :time-zone="selectedTimeZone"
        :trading-strategy-id="tradingStrategyId"
        :saved-generation="workbench.savedGeneration.value"
        :market-data-kind="workbench.editing.value?.marketDataKind ?? 'kCandle'"
        :replays-on-contract-account="workbench.editing.value?.replaysOnContractAccount ?? false"
        :trading-mode-label="workbench.editing.value?.tradingModeLabel ?? null"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.trading-strategy-page {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__notice {
    margin: 0;
    color: color('text-muted');
  }

  &__bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('xs');
  }

  &__mode {
    color: color('text-faint');
    font-size: font-size('xs');
  }

  &__destinations {
    margin-left: auto;
  }
}
</style>
