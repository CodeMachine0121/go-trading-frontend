<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyBotFormDialog from '~/components/organisms/StrategyBotFormDialog.vue'
import StrategyBotStatusBadge from '~/components/molecules/StrategyBotStatusBadge.vue'
import StrategyBotRunHistory from '~/components/molecules/StrategyBotRunHistory.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import type { StrategyApplication } from '~/application/strategy-application'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import type { TradingSymbolApplication } from '~/application/trading-symbol-application'
import { useStrategyBots } from '~/composables/use-strategy-bots'

// 有機體：機器人清單這一整塊——四種狀態、三顆按鈕、空清單、錯誤與重試。
//
// 它是使用者**唯一**會發現機器人出事的地方：四種停擺原因裡有兩種正好是
// 「通知他的那條路壞了」，所以沒有任何一條主動通知的路走得通。
const { strategyBotApplication, strategyApplication, timeZoneIdentifier } = defineProps<{
  strategyBotApplication: StrategyBotApplication
  strategyApplication: StrategyApplication
  /** 表單裡的標的欄位自己去取清單用的，這一層只是傳下去。 */
  tradingSymbolApplication: TradingSymbolApplication
  /** 歷史裡那些時間用哪一個時區說。整個操作台只有一個，所以由上面傳下來。 */
  timeZoneIdentifier: string
}>()

const bots = useStrategyBots(strategyBotApplication, strategyApplication)

onMounted(() => {
  void bots.load()
})
</script>

<template>
  <AppPanel title="我的機器人">
    <template #actions>
      <AppButton
        type="button"
        data-testid="bot-create"
        @click="bots.openCreateForm"
      >
        ＋ 拼一台機器人
      </AppButton>
    </template>

    <AppAlert
      v-if="bots.failureMessage.value !== ''"
      tone="danger"
      data-testid="bot-list-failure"
    >
      {{ bots.failureMessage.value }}
      <template #action>
        <AppButton
          type="button"
          variant="ghost"
          data-testid="bot-list-retry"
          @click="bots.load"
        >
          再試一次
        </AppButton>
      </template>
    </AppAlert>

    <!--
      啟動被 Telegram 擋下時，那句話要**帶著去設定的路**——
      他現在就在一個按鈕之外的地方，光說「請先完成設定」等於要他自己去找。
    -->
    <AppAlert
      v-if="bots.deliveryNotConfigured.value"
      tone="warning"
      data-testid="bot-delivery-not-configured"
    >
      要先完成 Telegram 設定，機器人才送得出訊息。
      <template #action>
        <NuxtLink
          to="/settings"
          data-testid="bot-delivery-settings-link"
        >
          去設定
        </NuxtLink>
      </template>
    </AppAlert>

    <p
      v-if="bots.loading.value"
      class="strategy-bot-list__notice"
    >
      讀取中…
    </p>

    <p
      v-else-if="bots.strategyBots.value.length === 0"
      class="strategy-bot-list__notice"
      data-testid="bot-list-empty"
    >
      還沒有任何機器人。拼一台之後，它會每隔幾分鐘自己看一次盤，
      在信號變了的時候傳訊息給你。
    </p>

    <ul
      v-else
      class="strategy-bot-list__rows"
    >
      <li
        v-for="strategyBot in bots.strategyBots.value"
        :key="strategyBot.id"
        class="strategy-bot-list__row"
        data-testid="bot-row"
      >
        <div class="strategy-bot-list__identity">
          <span class="strategy-bot-list__name">{{ strategyBot.name }}</span>
          <span class="strategy-bot-list__meta">
            {{ strategyBot.symbol }} · 每 {{ strategyBot.triggerIntervalMinutes }} 分鐘
          </span>
        </div>

        <StrategyBotStatusBadge :run-state="strategyBot.runState" />

        <span
          class="strategy-bot-list__meta"
          data-testid="bot-last-sent-signal"
        >
          上次訊號：{{ strategyBot.runState.lastSentSignalLabel }}
        </span>

        <div class="strategy-bot-list__actions">
          <!--
            電源鍵，不是播放鍵。播放說的是「跑一次這個東西」；一台常駐機器人是
            開著或關著，而那是兩張完全不同的心智圖。同一個位置的兩種樣子，
            因為一台機器人只有兩種狀態。
          -->
          <AppButton
            v-if="strategyBot.runState.canStart"
            type="button"
            variant="secondary"
            :disabled="bots.busyId.value === strategyBot.id"
            title="啟動這台機器人"
            data-testid="bot-start"
            @click="bots.start(strategyBot.id)"
          >
            <AppIcon name="power" />
            啟動
          </AppButton>
          <AppButton
            v-else
            type="button"
            :disabled="bots.busyId.value === strategyBot.id"
            title="停止這台機器人"
            data-testid="bot-stop"
            @click="bots.stop(strategyBot.id)"
          >
            <AppIcon name="power" />
            停止
          </AppButton>

          <!--
            試一次，不等排程。它走的是排程那一輪同一條路，所以按下去看到的
            就是它自己跑會做的事——這顆鍵要用來確認的正是那件事。
          -->
          <AppButton
            type="button"
            variant="secondary"
            :disabled="bots.busyId.value === strategyBot.id"
            title="不等排程，現在就跑一輪"
            data-testid="bot-run-now"
            @click="bots.runNow(strategyBot.id)"
          >
            立即運算
          </AppButton>

          <AppButton
            type="button"
            variant="ghost"
            :aria-expanded="bots.expandedBotId.value === strategyBot.id"
            data-testid="bot-history-toggle"
            @click="bots.toggleRunHistory(strategyBot.id)"
          >
            {{ bots.expandedBotId.value === strategyBot.id ? '收起紀錄' : '執行紀錄' }}
          </AppButton>

          <!-- 執行中不給按，並說得出為什麼——按了才被拒絕是把看得出來的事留到送出才講。 -->
          <AppButton
            type="button"
            variant="ghost"
            :disabled="!strategyBot.runState.canEdit"
            :title="strategyBot.runState.editBlockedReason"
            data-testid="bot-edit"
            @click="bots.openEditForm(strategyBot)"
          >
            編輯
          </AppButton>

          <AppButton
            type="button"
            variant="danger-ghost"
            data-testid="bot-delete"
            @click="bots.askToDelete(strategyBot)"
          >
            刪除
          </AppButton>
        </div>

        <StrategyBotRunHistory
          v-if="bots.expandedBotId.value === strategyBot.id"
          class="strategy-bot-list__history"
          :run-records="bots.runRecords.value"
          :loading="bots.runRecordsLoading.value"
          :failure-message="bots.runRecordsFailureMessage.value"
          :time-zone-identifier="timeZoneIdentifier"
        />
      </li>
    </ul>

    <StrategyBotFormDialog
      :open="bots.formOpen.value"
      :editing="bots.editing.value"
      :trading-symbol-application="tradingSymbolApplication"
      :strategy-options="bots.strategyOptions.value"
      :parameter-names-by-strategy-id="bots.parameterNamesByStrategyId.value"
      :saving="bots.saving.value"
      :failure-message="bots.formFailureMessage.value"
      @close="bots.closeForm"
      @save="bots.save"
    />

    <AppToast :message="bots.announcement.value" />

    <ConfirmDialog
      :open="bots.deleting.value !== null"
      title="刪掉這台機器人？"
      :message="`「${bots.deleting.value?.name ?? ''}」刪掉就沒了，正在跑的話也會一起停下來。`"
      confirm-label="刪掉"
      data-testid="bot-delete-confirm"
      @confirm="bots.confirmDelete"
      @cancel="bots.cancelDelete"
    />
  </AppPanel>
</template>

<style scoped lang="scss">
.strategy-bot-list {
  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('normal');
  }

  &__rows {
    display: flex;
    flex-direction: column;
    gap: spacing('xs');
    margin: 0;
    padding: 0;
    list-style: none;
  }

  // 一列一台。窄螢幕時它自己疊成一張卡——這幾樣東西天生是一份清單，
  // 欄位一樣、每一列讀法相同，對齊才看得出哪一台不一樣。
  &__row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: spacing('xs');
    padding: spacing('xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background: color('surface-muted');
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 12rem;
  }

  &__name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
  }

  &__meta {
    color: color('text-muted');
    font-size: font-size('sm');
  }

  &__actions {
    display: flex;
    gap: spacing('2xs');
    margin-left: auto;
  }

  // 展開的紀錄橫跨整列，所以那一列要能換行讓它自己佔一行。
  &__history {
    flex-basis: 100%;
  }
}
</style>
