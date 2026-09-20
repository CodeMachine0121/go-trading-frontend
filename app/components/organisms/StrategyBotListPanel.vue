<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import StrategyBotStatusBadge from '~/components/molecules/StrategyBotStatusBadge.vue'
import StrategyBotRunHistory from '~/components/molecules/StrategyBotRunHistory.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import type { StrategyBotApplication } from '~/application/strategy-bot-application'
import { useStrategyBots } from '~/composables/use-strategy-bots'

// 有機體：機器人清單這一整塊——四種狀態、三顆按鈕、空清單、錯誤與重試。
//
// 它是使用者**唯一**會發現機器人出事的地方：四種停擺原因裡有兩種正好是
// 「通知他的那條路壞了」，所以沒有任何一條主動通知的路走得通。
const { strategyBotApplication, timeZoneIdentifier } = defineProps<{
  strategyBotApplication: StrategyBotApplication
  /** 歷史裡那些時間用哪一個時區說。整個操作台只有一個，所以由上面傳下來。 */
  timeZoneIdentifier: string
}>()

const bots = useStrategyBots(strategyBotApplication)

onMounted(() => {
  void bots.load()
})
</script>

<template>
  <AppPanel title="我的機器人">
    <template #actions>
      <!--
        走一條路由而不是開一個對話框：拼一台機器人要看到的東西遠多於一個浮在
        清單上的框裝得下，而一個功能兩個入口，兩邊都要維護、遲早不一致。
      -->
      <!--
        這裡**沒有**一顆通往交易策略的鍵：它在側欄上有自己的一格了，
        而一個去處在導覽裡之後，別的面板標頭再放一顆按鈕就是同一件事的第二個入口。
        指向某一台機器人**正在用的那一份**的連結是另一回事——那不是導覽，
        那是「這一台在用的是哪一份」，所以它留在下面每一列上。
      -->
      <AppButton
        to="/strategy-bots/new"
        data-testid="bot-create"
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
      在訊號變了的時候傳訊息給你。
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
        <!--
          名字與狀態同一行、其餘往下疊：一列機器人要回答的第一個問題是
          「它現在跑著嗎」，而那個答案要與名字在同一條視線上。
          原本狀態牌子排在名字**後面**，於是在窄螢幕上它會被擠到第三行去。
        -->
        <div class="strategy-bot-list__headline">
          <span class="strategy-bot-list__name">{{ strategyBot.name }}</span>
          <StrategyBotStatusBadge :run-state="strategyBot.runState" />
        </div>

        <div class="strategy-bot-list__identity">
          <span class="strategy-bot-list__meta">
            {{ strategyBot.symbol }} · 每 {{ strategyBot.triggerIntervalMinutes }} 分鐘
          </span>
          <!--
            它照哪一套規則跑。做成連結而不是一行字：一個看得到卻點不進去的名字，
            只會讓人自己去另一份清單裡找同一個名字。
          -->
          <NuxtLink
            class="strategy-bot-list__meta"
            :to="`/trading-strategies/${strategyBot.tradingStrategyId}`"
            data-testid="bot-trading-strategy"
          >
            {{ strategyBot.tradingStrategyName === '' ? '（未知的交易策略）' : strategyBot.tradingStrategyName }}
          </NuxtLink>
        </div>

        <div class="strategy-bot-list__footer">
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

            <!--
            執行中不給按，並說得出為什麼——按了才被拒絕是把看得出來的事留到送出才講。

            不給按的那一版**不是連結**：一個帶著 disabled 的連結照樣點得進去，
            而點得進去就等於那條規則只是畫上去的。
          -->
            <AppButton
              v-if="strategyBot.runState.canEdit"
              :to="`/strategy-bots/${strategyBot.id}`"
              variant="ghost"
              data-testid="bot-edit"
            >
              編輯
            </AppButton>
            <AppButton
              v-else
              type="button"
              variant="ghost"
              disabled
              :title="strategyBot.runState.editBlockedReason"
              data-testid="bot-edit"
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

    <!--
      「存好了」那一句由工作台說，在這一頁看到——存完之後使用者已經被送回來了。
    -->
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
  // 由上往下讀：叫什麼／跑著沒有、盯哪裡多久、照哪一套規則、上次說了什麼。
  // 原本是一整列橫著排，在窄螢幕上那四樣會折成看不出先後的一團。
  &__row {
    display: flex;
    flex-direction: column;
    gap: spacing('2xs');
    border: 1px solid color('border');
    border-radius: radius('md');
    background: color('surface-muted');
    padding: spacing('sm');
  }

  &__headline {
    display: flex;
    gap: spacing('sm');
    align-items: center;
    justify-content: space-between;
  }

  &__identity {
    display: flex;
    flex-direction: column;
    gap: spacing('3xs');
    min-width: 0;
  }

  &__name {
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('md');
  }

  &__meta {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  // 上次說了什麼與那幾顆鍵同一行：前者是這一台最新的結果，後者是對它的處置，
  // 讀完結果的下一個動作就在旁邊。
  &__footer {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('xs');
    align-items: center;
    justify-content: space-between;
  }

  // 五顆鍵在一支手機上排不成一行（光是它們自己就要三百多像素），
  // 而它們不會縮——按鈕裡的字不折行。所以這裡要讓它們換行，
  // 否則整個工作區會多出一條橫向捲軸，就在這一刀特地為手機重排的那一列上。
  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: spacing('2xs');
    margin-left: auto;
  }

  // 展開的紀錄橫跨整列，所以那一列要能換行讓它自己佔一行。
  &__history {
    flex-basis: 100%;
  }
}
</style>
