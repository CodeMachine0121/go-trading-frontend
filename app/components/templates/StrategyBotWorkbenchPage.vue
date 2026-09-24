<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import StrategyBotForm from '~/components/organisms/StrategyBotForm.vue'
import { useStrategyBotWorkbench } from '~/composables/use-strategy-bot-workbench'
import type { MarketDataKind } from '~/domain/models/vo/market-data-kind-vo'

// 模板：拼一台機器人那一頁的內容。
//
// 新增與編輯共用它，因為那兩件事要做的一模一樣——差別只有「有沒有一台要讀」，
// 而那是一個參數，不是兩個頁面。頂列的標題說的是哪一邊（現貨／合約），
// 這一頁在做的是新拼還是改一台，由內容自己的標題說。
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
  <div class="strategy-bot-workbench">
    <header class="strategy-bot-workbench__header">
      <AppButton
        variant="ghost"
        size="small"
        :to="page.listPath"
        data-testid="workbench-back"
      >
        ‹ 回清單
      </AppButton>
      <h2
        class="strategy-bot-workbench__title"
        data-testid="workbench-title"
      >
        {{ strategyBotId === null ? page.createTitle : page.editTitle }}
      </h2>
    </header>

    <!-- 要被送去另一頁的那一刻也還是「讀取中」：一閃而過的空白表單會讓人以為要新拼一台。 -->
    <p
      v-if="workbench.loading.value || workbench.redirectPath.value !== null"
      class="strategy-bot-workbench__notice"
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
  </div>
</template>

<style scoped lang="scss">
// 一張表單讀起來是一欄：拉得跟寬螢幕一樣寬的話，一格名稱會長到半個畫面，
// 而眼睛要在每一格之間橫跨整個螢幕。
.strategy-bot-workbench {
  display: flex;
  flex-direction: column;
  gap: spacing('md');
  margin: 0 auto;
  width: 100%;
  max-width: 44rem;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: spacing('2xs');
  }

  &__title {
    margin: 0;
    color: color('text-strong');
    font-weight: font-weight('bold');
    font-size: font-size('lg');
  }

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
  }
}
</style>
