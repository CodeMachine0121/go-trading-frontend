<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppTabs from '~/components/atoms/AppTabs.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import TradingStrategyBacktestPane from '~/components/organisms/TradingStrategyBacktestPane.vue'
import TradingStrategyWorkbench from '~/components/organisms/TradingStrategyWorkbench.vue'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import { useTradingStrategyWorkbench } from '~/composables/use-trading-strategy-workbench'

// 模板：工作台那一頁的整個殼。
//
// 新增與編輯共用它，因為那兩件事要做的一模一樣——差別只有「有沒有一份要讀」，
// 而那是一個參數，不是兩個頁面。兩個頁面各寫一次的話，
// 第二個就是那個忘記跟著改的地方。
const { tradingStrategyId } = defineProps<{
  /** 有值就是改那一份，`null` 就是新拼一份。 */
  tradingStrategyId: number | null
}>()

const {
  $tradingStrategyApplication,
  $strategyScriptApplication,
  $backtestApplication,
  $tradingSymbolApplication,
} = useNuxtApp()

/**
 * 這一頁有兩個去處：拼規則，與拿歷史問它一次。
 *
 * 打開時停在工作檯，那是這一頁原本就在做的事。切換不清空任何東西——
 * 兩邊都還掛在畫面上，只是其中一邊此刻看得見，所以填到一半的回測條件不會掉。
 */
const WORKBENCH_DESTINATIONS = [
  { value: 'workbench', label: '拼規則' },
  { value: 'backtest', label: '回測' },
] as const

const destination = ref<string>(WORKBENCH_DESTINATIONS[0].value)

/** 這一份被存過幾次。回測那一側看著它決定何時把上一次的成績單清掉。 */
const savedGeneration = ref(0)

const workbench = useTradingStrategyWorkbench(
  $tradingStrategyApplication, $strategyScriptApplication, tradingStrategyId)

const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()

onMounted(() => {
  void workbench.load()
})

/**
 * 存好了、或那一份根本不在了，就回清單。
 *
 * 用 watch 而不是在 save 裡直接跳轉：跳轉是這一頁的事，存是那個 composable 的事，
 * 而一個知道怎麼跳轉的 composable 就跟著知道了它被放在哪一條路由底下。
 */
watch([() => workbench.saved.value, () => workbench.missing.value], ([justSaved, notThere]) => {
  if (justSaved || notThere) {
    void navigateTo('/trading-strategies')
  }
})

const { selectedTimeZone } = useSelectedTimeZone()

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
  <ConsoleLayout
    :title="tradingStrategyId === null ? '拼一份交易策略' : '改一改這份交易策略'"
    subtitle="左邊準備材料，右邊把積木放進空位裡。買入與賣出同時看得見——兩邊都成立的話，照它跑的機器人什麼都不會說。"
  >
    <template #status>
      <BackendStatusIndicator
        :health="health"
        :checking="checking"
        :error-message="errorMessage"
        @recheck="checkBackendHealth"
      />
    </template>

    <template #identity>
      <SignedInUserBadge
        v-if="currentUser"
        :user="currentUser"
        @sign-out="signOut"
      />
    </template>

    <p
      v-if="workbench.loading.value"
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
      <!-- 切換擺在工作檯上面：兩個去處問的是同一份規則的兩個問題。 -->
      <AppTabs
        v-model="destination"
        :options="WORKBENCH_DESTINATIONS"
      />

      <!--
        兩個去處都掛著，只有一個看得見。用 v-show 而不是 v-if，
        是因為填到一半的回測條件與已經算出來的結果都必須留著——
        切過去再切回來，畫面與離開時一樣。
      -->
      <TradingStrategyWorkbench
        v-show="destination === 'workbench'"
        :editing="workbench.editing.value"
        :strategy-script-options="workbench.strategyScriptOptions.value"
        :parameter-names-by-strategy-script-id="workbench.parameterNamesByStrategyScriptId.value"
        :saving="workbench.saving.value"
        :failure-message="workbench.failureMessage.value"
        @cancel="navigateTo('/trading-strategies')"
        @save="workbench.save"
        @dirty-change="workbench.markDirty"
      />

      <TradingStrategyBacktestPane
        v-show="destination === 'backtest'"
        :backtest-application="$backtestApplication"
        :trading-symbol-application="$tradingSymbolApplication"
        :time-zone="selectedTimeZone"
        :trading-strategy-id="tradingStrategyId"
        :saved-generation="savedGeneration"
      />
    </template>
  </ConsoleLayout>
</template>
