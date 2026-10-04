<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyBotStatusBadge from '~/components/molecules/StrategyBotStatusBadge.vue'
import StrategyBotRunHistory from '~/components/molecules/StrategyBotRunHistory.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import StrategyBotAutoOrderSwitch from '~/components/molecules/StrategyBotAutoOrderSwitch.vue'
import { useStrategyBotAutoOrder } from '~/composables/use-strategy-bot-auto-order'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { useStrategyBots } from '~/composables/use-strategy-bots'
import type { StrategyBotPageDto } from '~/domain/models/dto/strategy-bot-page-dto'

// 有機體：機器人清單這一整塊——四種狀態、那一排按鈕、空清單、錯誤與重試，
// 以及選中那一台的執行紀錄（寬螢幕在清單旁邊，手機上在那一台底下）。
//
// 它是使用者**唯一**會發現機器人出事的地方：四種停擺原因裡有兩種正好是
// 「通知他的那條路壞了」，所以沒有任何一條主動通知的路走得通。
const { strategyBotApplication, page, timeZoneIdentifier, showsDetailInline = false } = defineProps<{
  strategyBotApplication: StrategyBotApplication
  /** 這一頁列的是哪一種機器人。 */
  page: StrategyBotPageDto
  /** 歷史裡那些時間用哪一個時區說。整個操作台只有一個，所以由上面傳下來。 */
  timeZoneIdentifier: string
  /**
   * 選中那一台的紀錄展開在它自己底下，而不是清單旁邊。
   *
   * 手機上沒有「旁邊」：放在整份清單下面的話，按了第一台卻要捲過其餘每一台才看得到它的紀錄。
   */
  showsDetailInline?: boolean
}>()

const { t } = useI18n()
const { localize } = useLocalizedText()

const bots = useStrategyBots(strategyBotApplication, page.marketDataKind)
const autoOrder = useStrategyBotAutoOrder(strategyBotApplication)

async function switchAutoOrder(strategyBotId: number, enabled: boolean) {
  const switched = await autoOrder.switchAutoOrder(strategyBotId, enabled)
  if (switched !== null) {
    bots.replaceStrategyBot(switched)
  }
}

/** 選中的那一台——紀錄展開著的那一台。一次只會有一台。 */
const selectedBot = computed(
  () => bots.strategyBots.value.find(strategyBot => strategyBot.id === bots.expandedBotId.value) ?? null)

/**
 * 清單上方那一條數字：幾台、幾台跑著、幾台被系統停下來。
 *
 * 只數得出清單上本來就有的東西——跑得好不好、賺了多少不在這份資料裡，所以一個都不編。
 */
const runningCount = computed(
  () => bots.strategyBots.value.filter(strategyBot => strategyBot.runState.isRunning).length)
const haltedCount = computed(
  () => bots.strategyBots.value.filter(strategyBot => strategyBot.runState.isHalted).length)

onMounted(() => {
  void bots.load()
})
</script>

<template>
  <div class="strategy-bot-list">
    <header class="strategy-bot-list__toolbar">
      <!--
        只數得出清單上本來就有的東西。一台都沒有時不畫：三個零是一張空表的另一種說法。
      -->
      <dl
        v-if="bots.strategyBots.value.length > 0"
        class="strategy-bot-list__summary"
        data-testid="bot-summary"
      >
        <div class="strategy-bot-list__figure">
          <dt>{{ t('strategyBot.listPanel.summaryTotal') }}</dt>
          <dd>{{ bots.strategyBots.value.length }}</dd>
        </div>
        <div class="strategy-bot-list__figure strategy-bot-list__figure--running">
          <dt>{{ t('strategyBot.listPanel.summaryRunning') }}</dt>
          <dd>{{ runningCount }}</dd>
        </div>
        <div class="strategy-bot-list__figure strategy-bot-list__figure--halted">
          <dt>{{ t('strategyBot.listPanel.summaryHalted') }}</dt>
          <dd>{{ haltedCount }}</dd>
        </div>
      </dl>

      <!--
        這裡**沒有**一顆通往交易策略的鍵：它在側欄上有自己的一格了，
        而一個去處在導覽裡之後，別的地方再放一顆按鈕就是同一件事的第二個入口。
        指向某一台機器人**正在用的那一份**的連結是另一回事——那不是導覽，
        那是「這一台在用的是哪一份」，所以它留在下面每一列上。

        走一條路由而不是開一個對話框：拼一台機器人要看到的東西遠多於一個浮在
        清單上的框裝得下，而一個功能兩個入口，兩邊都要維護、遲早不一致。
      -->
      <AppButton
        class="strategy-bot-list__create"
        :to="page.newPath"
        data-testid="bot-create"
      >
        {{ localize(page.createLabel) }}
      </AppButton>
    </header>

    <AppAlert
      v-if="bots.failureMessage.value !== null"
      tone="danger"
      data-testid="bot-list-failure"
    >
      {{ localize(bots.failureMessage.value) }}
      <template #action>
        <AppButton
          type="button"
          variant="ghost"
          data-testid="bot-list-retry"
          @click="bots.load"
        >
          {{ t('strategyBot.listPanel.retry') }}
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
      {{ t('strategyBot.listPanel.deliveryNotConfigured') }}
      <template #action>
        <NuxtLink
          to="/settings"
          data-testid="bot-delivery-settings-link"
        >
          {{ t('strategyBot.common.goToSettings') }}
        </NuxtLink>
      </template>
    </AppAlert>

    <p
      v-if="bots.loading.value"
      class="strategy-bot-list__notice"
    >
      {{ t('strategyBot.common.loading') }}
    </p>

    <p
      v-else-if="bots.strategyBots.value.length === 0"
      class="strategy-bot-list__notice strategy-bot-list__notice--empty"
      data-testid="bot-list-empty"
    >
      {{ localize(page.emptyNotice) }}
    </p>

    <div
      v-else
      class="strategy-bot-list__workspace"
      :class="{ 'strategy-bot-list__workspace--with-detail': selectedBot !== null && !showsDetailInline }"
    >
      <AppPanel
        flush
        class="strategy-bot-list__table"
      >
        <!-- 欄名只在排成一欄一欄的寬螢幕上有意義；疊成卡片時每一格自己說得出它是什麼。 -->
        <div
          class="strategy-bot-list__columns"
          aria-hidden="true"
        >
          <span>{{ t('strategyBot.listPanel.nameAndStatusColumn') }}</span>
          <span>{{ t('strategyBot.listPanel.symbolAndTradingStrategyColumn') }}</span>
          <span>{{ t('strategyBot.listPanel.lastSignalColumn') }}</span>
          <span />
        </div>

        <ul class="strategy-bot-list__rows">
          <li
            v-for="strategyBot in bots.strategyBots.value"
            :key="strategyBot.id"
            class="strategy-bot-list__row"
            :class="{
              'strategy-bot-list__row--selected': strategyBot.id === bots.expandedBotId.value,
              'strategy-bot-list__row--halted': strategyBot.runState.isHalted,
            }"
            data-testid="bot-row"
          >
            <!--
              名字與狀態同一格：一列機器人要回答的第一個問題是「它現在跑著嗎」，
              而那個答案要與名字在同一條視線上。
            -->
            <div class="strategy-bot-list__headline">
              <span class="strategy-bot-list__name">{{ strategyBot.name }}</span>
              <StrategyBotStatusBadge :run-state="strategyBot.runState" />
              <AppBadge
                v-if="strategyBot.autoOrderEnabled"
                variant="accent"
                data-testid="bot-auto-order-badge"
              >
                {{ t('strategyBot.common.autoOrder') }}
              </AppBadge>
            </div>

            <div class="strategy-bot-list__identity">
              <span class="strategy-bot-list__meta strategy-bot-list__meta--market">
                {{ localize(strategyBot.symbolLabel) }} · {{ t('strategyBot.common.everyMinutes', { minutes: strategyBot.triggerIntervalMinutes }) }}<template v-if="strategyBot.leverageLabel !== null"> · {{ localize(strategyBot.leverageLabel) }}</template>
              </span>
              <!--
                它照哪一套規則跑。做成連結而不是一行字：一個看得到卻點不進去的名字，
                只會讓人自己去另一份清單裡找同一個名字。
              -->
              <NuxtLink
                class="strategy-bot-list__strategy"
                :to="`/trading-strategies/${strategyBot.tradingStrategyId}`"
                data-testid="bot-trading-strategy"
              >
                {{ strategyBot.tradingStrategyName === '' ? t('strategyBot.listPanel.unknownTradingStrategy') : strategyBot.tradingStrategyName }}
              </NuxtLink>
            </div>

            <span
              class="strategy-bot-list__signal"
              data-testid="bot-last-sent-signal"
            >
              <span class="strategy-bot-list__signal-label">{{ t('strategyBot.listPanel.lastSignalLabel') }}</span>{{ localize(strategyBot.runState.lastSentSignalLabel) }}
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
                size="small"
                :disabled="bots.busyId.value === strategyBot.id"
                :title="t('strategyBot.listPanel.startTitle')"
                data-testid="bot-start"
                @click="bots.start(strategyBot.id)"
              >
                <AppIcon
                  name="power"
                  size="small"
                />
                {{ t('strategyBot.listPanel.start') }}
              </AppButton>
              <AppButton
                v-else
                type="button"
                variant="danger-ghost"
                size="small"
                :disabled="bots.busyId.value === strategyBot.id"
                :title="t('strategyBot.listPanel.stopTitle')"
                data-testid="bot-stop"
                @click="bots.stop(strategyBot.id)"
              >
                <AppIcon
                  name="power"
                  size="small"
                />
                {{ t('strategyBot.listPanel.stop') }}
              </AppButton>

              <!--
                試一次，不等排程。它走的是排程那一輪同一條路，所以按下去看到的
                就是它自己跑會做的事——這顆鍵要用來確認的正是那件事。
              -->
              <AppButton
                type="button"
                variant="secondary"
                size="small"
                :disabled="bots.busyId.value === strategyBot.id"
                :title="t('strategyBot.listPanel.runNowTitle')"
                data-testid="bot-run-now"
                @click="bots.runNow(strategyBot.id)"
              >
                {{ t('strategyBot.listPanel.runNow') }}
              </AppButton>

              <AppButton
                type="button"
                variant="ghost"
                size="small"
                :aria-expanded="bots.expandedBotId.value === strategyBot.id"
                data-testid="bot-history-toggle"
                @click="bots.toggleRunHistory(strategyBot.id)"
              >
                {{ bots.expandedBotId.value === strategyBot.id ? t('strategyBot.listPanel.collapseRunHistory') : t('strategyBot.listPanel.runHistory') }}
              </AppButton>

              <!--
                執行中不給按，並說得出為什麼——按了才被拒絕是把看得出來的事留到送出才講。

                不給按的那一版**不是連結**：一個帶著 disabled 的連結照樣點得進去，
                而點得進去就等於那條規則只是畫上去的。
              -->
              <AppButton
                v-if="strategyBot.runState.canEdit"
                :to="strategyBot.editPath"
                variant="ghost"
                size="small"
                data-testid="bot-edit"
              >
                {{ t('strategyBot.listPanel.edit') }}
              </AppButton>
              <AppButton
                v-else
                type="button"
                variant="ghost"
                size="small"
                disabled
                :title="strategyBot.runState.editBlockedReason === null ? undefined : localize(strategyBot.runState.editBlockedReason)"
                data-testid="bot-edit"
              >
                {{ t('strategyBot.listPanel.edit') }}
              </AppButton>

              <AppButton
                type="button"
                variant="danger-ghost"
                size="small"
                data-testid="bot-delete"
                @click="bots.askToDelete(strategyBot)"
              >
                {{ t('strategyBot.listPanel.delete') }}
              </AppButton>
            </div>

            <StrategyBotAutoOrderSwitch
              v-if="showsDetailInline && strategyBot.id === bots.expandedBotId.value"
              class="strategy-bot-list__inline-history"
              :enabled="strategyBot.autoOrderEnabled"
              :notice="page.autoOrderNotice"
              :position-label="strategyBot.autoOrderPositionLabel"
              :switching="autoOrder.switchingStrategyBotId.value === strategyBot.id"
              :refusal="autoOrder.refusalFor(strategyBot.id)"
              :failure-message="autoOrder.failureMessageFor(strategyBot.id)"
              @switch="switchAutoOrder(strategyBot.id, $event)"
            />

            <StrategyBotRunHistory
              v-if="showsDetailInline && strategyBot.id === bots.expandedBotId.value"
              class="strategy-bot-list__inline-history"
              :run-records="bots.runRecords.value"
              :loading="bots.runRecordsLoading.value"
              :failure-message="bots.runRecordsFailureMessage.value"
              :time-zone-identifier="timeZoneIdentifier"
              :note="page.runHistoryNote"
            />
          </li>
        </ul>
      </AppPanel>

      <!--
        寬螢幕上選中的那一台在清單旁邊展開：清單留在原地，看完一台的紀錄
        不必捲回去找下一台。
      -->
      <AppPanel
        v-if="selectedBot !== null && !showsDetailInline"
        class="strategy-bot-list__detail"
        :title="selectedBot.name"
        data-testid="bot-detail"
      >
        <template #meta>
          <span class="strategy-bot-list__meta">
            {{ localize(selectedBot.symbolLabel) }} · {{ t('strategyBot.common.everyMinutes', { minutes: selectedBot.triggerIntervalMinutes }) }}<template v-if="selectedBot.leverageLabel !== null"> · {{ localize(selectedBot.leverageLabel) }}</template>
          </span>
        </template>
        <template #actions>
          <AppButton
            type="button"
            variant="ghost"
            size="small"
            :label="t('strategyBot.listPanel.closeRunHistory')"
            data-testid="bot-detail-close"
            @click="bots.toggleRunHistory(selectedBot.id)"
          >
            <AppIcon
              name="close"
              size="small"
            />
          </AppButton>
        </template>

        <StrategyBotAutoOrderSwitch
          class="strategy-bot-list__detail-auto-order"
          :enabled="selectedBot.autoOrderEnabled"
          :notice="page.autoOrderNotice"
          :position-label="selectedBot.autoOrderPositionLabel"
          :switching="autoOrder.switchingStrategyBotId.value === selectedBot.id"
          :refusal="autoOrder.refusalFor(selectedBot.id)"
          :failure-message="autoOrder.failureMessageFor(selectedBot.id)"
          @switch="switchAutoOrder(selectedBot.id, $event)"
        />

        <h3 class="strategy-bot-list__detail-heading">
          {{ t('strategyBot.listPanel.runHistory') }}
        </h3>
        <StrategyBotRunHistory
          :run-records="bots.runRecords.value"
          :loading="bots.runRecordsLoading.value"
          :failure-message="bots.runRecordsFailureMessage.value"
          :time-zone-identifier="timeZoneIdentifier"
          :note="page.runHistoryNote"
        />
      </AppPanel>
    </div>

    <!--
      「存好了」那一句由工作台說，在這一頁看到——存完之後使用者已經被送回來了。
    -->
    <AppToast :message="localize(bots.announcement.value)" />

    <ConfirmDialog
      :open="bots.deleting.value !== null"
      :title="t('strategyBot.listPanel.deleteTitle')"
      :message="t('strategyBot.listPanel.deleteMessage', { name: bots.deleting.value?.name ?? '' })"
      :confirm-label="t('strategyBot.listPanel.deleteConfirm')"
      variant="danger"
      data-testid="bot-delete-confirm"
      @confirm="bots.confirmDelete"
      @cancel="bots.cancelDelete"
    />
  </div>
</template>

<style scoped lang="scss">
// 寬螢幕上一台一列、欄位對齊：這幾樣東西天生是一份清單，對齊才看得出哪一台不一樣。
// 手機上一台一張卡，由上往下讀：叫什麼／跑著沒有、盯哪裡多久、照哪一套規則、上次說了什麼。
.strategy-bot-list {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('sm');
  }

  &__create {
    margin-left: auto;
  }

  &__summary {
    display: flex;
    gap: spacing('xs');
    margin: 0;
  }

  &__figure {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background-color: color('surface');
    padding: spacing('2xs') spacing('sm');
    min-width: 5rem;

    dt {
      @include dense-label;
    }

    dd {
      margin: 0;
      color: color('text-strong');
      font-weight: font-weight('semibold');
      font-size: font-size('lg');

      @include numeric;
    }

    &--running dd {
      color: color('success');
    }

    &--halted dd {
      color: color('danger');
    }
  }

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');
    line-height: line-height('normal');

    &--empty {
      border: 1px dashed color('border-strong');
      border-radius: radius('md');
      padding: spacing('xl') spacing('md');
      text-align: center;
    }
  }

  &__workspace {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: spacing('sm');
    align-items: start;

    // 選中一台時，紀錄在清單右邊；再窄就排到清單底下，不把清單擠成一條。
    &--with-detail {
      @include respond-to('xl') {
        grid-template-columns: minmax(0, 1fr) 24rem;
      }
    }
  }

  &__columns {
    display: none;
    border-bottom: 1px solid color('border');
    background-color: color('surface-muted');
    padding: spacing('xs') spacing('md');

    @include dense-label;

    @include respond-to('md') {
      display: grid;
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.3fr) minmax(0, 0.8fr) 17rem;
      gap: spacing('sm');
    }
  }

  &__rows {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__row {
    display: grid;
    grid-template-areas:
      'headline'
      'identity'
      'signal'
      'actions';
    gap: spacing('2xs');
    border-bottom: 1px solid color('border');
    padding: spacing('sm') spacing('md');

    &:last-child {
      border-bottom: none;
    }

    @include respond-to('md') {
      grid-template-areas: 'headline identity signal actions';
      grid-template-columns: minmax(0, 1.3fr) minmax(0, 1.3fr) minmax(0, 0.8fr) 17rem;
      gap: spacing('xs') spacing('sm');
      align-items: center;
    }

    // 選中的那一台左邊一條強調色：旁邊那塊紀錄說的是哪一台，一眼對得上。
    &--selected {
      box-shadow: inset 2px 0 0 color('primary');
      background-color: color('primary-soft');
    }

    // 被系統停下來的那一台整列轉色：這份清單是使用者唯一會發現機器人出事的地方。
    &--halted {
      background-color: color('danger-soft');
    }
  }

  &__headline {
    display: flex;
    flex-wrap: wrap;
    grid-area: headline;
    gap: spacing('2xs') spacing('xs');
    align-items: center;
    min-width: 0;
  }

  &__name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('md');
  }

  &__identity {
    display: flex;
    flex-direction: column;
    grid-area: identity;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__meta {
    color: color('text-muted');
    font-size: font-size('xs');

    &--market {
      @include numeric;
    }
  }

  &__strategy {
    color: color('primary');
    font-size: font-size('xs');
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__signal {
    grid-area: signal;
    color: color('text');
    font-size: font-size('xs');
  }

  // 寬螢幕上欄名已經說了這一格是什麼；疊成卡片時才要自己說。
  &__signal-label {
    color: color('text-muted');

    @include respond-to('md') {
      @include visually-hidden;
    }
  }

  // 五顆鍵在一支手機上排不成一行，而按鈕裡的字不折行——所以讓它們換行，
  // 否則整個工作區會多出一條橫向捲軸。
  &__actions {
    display: flex;
    flex-wrap: wrap;
    grid-area: actions;
    gap: spacing('2xs');

    @include respond-to('md') {
      justify-content: flex-end;
    }
  }

  // 紀錄只在展開時才佔一列，所以它不在版面格線上預留位置——空的一列也會多吃一道間距。
  &__inline-history {
    grid-column: 1 / -1;
    border-top: 1px solid color('border');
    padding-top: spacing('xs');
  }

  &__detail-auto-order {
    margin-bottom: spacing('sm');
    border-bottom: 1px solid color('border');
    padding-bottom: spacing('sm');
  }

  &__detail-heading {
    margin: 0 0 spacing('2xs');

    @include dense-label;
  }
}
</style>
