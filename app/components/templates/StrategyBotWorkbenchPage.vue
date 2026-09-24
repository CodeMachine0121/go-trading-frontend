<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import StrategyBotForm from '~/components/organisms/StrategyBotForm.vue'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import { useStrategyBotWorkbench } from '~/composables/use-strategy-bot-workbench'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

// 模板：拼一台機器人那一頁的整個殼。
//
// 新增與編輯共用它，因為那兩件事要做的一模一樣——差別只有「有沒有一台要讀」，
// 而那是一個參數，不是兩個頁面。
const { strategyBotId, marketDataKind } = defineProps<{
  /** 有值就是改那一台，`null` 就是新拼一台。 */
  strategyBotId: number | null
  /** 這一頁拼的是現貨機器人還是合約機器人。 */
  marketDataKind: MarketDataKind
}>()

const { $strategyBotApplication, $tradingStrategyApplication, $tradingSymbolApplication }
  = useNuxtApp()

const workbench = useStrategyBotWorkbench(
  $strategyBotApplication, $tradingStrategyApplication, strategyBotId, marketDataKind)
const page = workbench.page

const { health, checking, errorMessage, checkBackendHealth } = useBackendHealth()
const { currentUser, signOut } = useUserSession()

onMounted(() => {
  void workbench.load()
})

/**
 * 存好了、或那一台根本不在了，就回清單。
 *
 * 用 watch 而不是在 save 裡直接跳轉：跳轉是這一頁的事，存是那個 composable 的事，
 * 而一個知道怎麼跳轉的 composable 就跟著知道了它被放在哪一條路由底下。
 */
watch([() => workbench.saved.value, () => workbench.missing.value], ([justSaved, notThere]) => {
  if (justSaved || notThere) {
    void navigateTo(page.listPath)
  }
})

/** 讀到的是另一種機器人：送到它自己那一種的編輯頁，不在這一頁改它。 */
watch(() => workbench.redirectPath.value, (path) => {
  if (path !== null) {
    void navigateTo(path, { replace: true })
  }
})

/** 改到一半想離開就先問過。什麼都沒改時不問。 */
onBeforeRouteLeave(() => workbench.dirty.value
  ? window.confirm('這一頁改過的東西還沒存，確定要離開嗎？')
  : true)
</script>

<template>
  <ConsoleLayout
    :title="strategyBotId === null ? page.createTitle : page.editTitle"
    subtitle="挑一份交易策略，說它盯哪個市場、多久看一次。規則本身在交易策略那一頁調——同一份可以讓好幾台機器人一起用。"
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

    <!-- 要被送去另一頁的那一刻也還是「讀取中」：一閃而過的空白表單會讓人以為要新拼一台。 -->
    <p
      v-if="workbench.loading.value || workbench.redirectPath.value !== null"
      data-testid="workbench-loading"
    >
      讀取中…
    </p>

    <AppAlert
      v-else-if="workbench.missing.value"
      tone="danger"
      data-testid="workbench-missing"
    >
      找不到這一台機器人，它可能已經被刪掉了。
    </AppAlert>

    <StrategyBotForm
      v-else
      :editing="workbench.editing.value"
      :page="page"
      :trading-symbol-application="$tradingSymbolApplication"
      :trading-strategy-options="workbench.tradingStrategyOptions.value"
      :saving="workbench.saving.value"
      :failure-message="workbench.failureMessage.value"
      @cancel="navigateTo(page.listPath)"
      @save="workbench.save"
      @dirty-change="workbench.markDirty"
    />
  </ConsoleLayout>
</template>
