<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import BackendStatusIndicator from '~/components/molecules/BackendStatusIndicator.vue'
import SignedInUserBadge from '~/components/molecules/SignedInUserBadge.vue'
import StrategyBotWorkbench from '~/components/organisms/StrategyBotWorkbench.vue'
import ConsoleLayout from '~/components/templates/ConsoleLayout.vue'
import { useStrategyBotWorkbench } from '~/composables/use-strategy-bot-workbench'

// 模板：工作台那一頁的整個殼。
//
// 新增與編輯共用它，因為那兩件事要做的一模一樣——差別只有「有沒有一台要讀」，
// 而那是一個參數，不是兩個頁面。兩個頁面各寫一次的話，
// 第二個就是那個忘記跟著改的地方。
const { strategyBotId } = defineProps<{
  /** 有值就是改那一台，`null` 就是新拼一台。 */
  strategyBotId: number | null
}>()

const { $strategyBotApplication, $strategyApplication, $tradingSymbolApplication } = useNuxtApp()

const workbench = useStrategyBotWorkbench(
  $strategyBotApplication, $strategyApplication, strategyBotId)

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
    void navigateTo('/strategy-bots')
  }
})

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
    :title="strategyBotId === null ? '拼一台機器人' : '改一改這台機器人'"
    subtitle="左邊準備材料，右邊把積木放進空位裡。買入與賣出同時看得見——兩邊都成立的話，這台機器人什麼都不會說。"
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
      找不到這一台機器人，它可能已經被刪掉了。
    </AppAlert>

    <StrategyBotWorkbench
      v-else
      :editing="workbench.editing.value"
      :trading-symbol-application="$tradingSymbolApplication"
      :strategy-options="workbench.strategyOptions.value"
      :parameter-names-by-strategy-id="workbench.parameterNamesByStrategyId.value"
      :saving="workbench.saving.value"
      :failure-message="workbench.failureMessage.value"
      @cancel="navigateTo('/strategy-bots')"
      @save="workbench.save"
      @dirty-change="workbench.markDirty"
    />
  </ConsoleLayout>
</template>
