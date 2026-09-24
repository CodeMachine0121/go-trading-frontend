<script setup lang="ts">
import AppAlert from '~/components/atoms/AppAlert.vue'
import AppBadge from '~/components/atoms/AppBadge.vue'
import AppButton from '~/components/atoms/AppButton.vue'
import AppIcon from '~/components/atoms/AppIcon.vue'
import AppPanel from '~/components/atoms/AppPanel.vue'
import AppToast from '~/components/atoms/AppToast.vue'
import ConfirmDialog from '~/components/molecules/ConfirmDialog.vue'
import type { TradingStrategyApplication } from '~/application/trading-strategy-application'
import { useTradingStrategies } from '~/composables/use-trading-strategies'

// 有機體：交易策略清單這一整塊——每一份、空清單、錯誤與重試、刪除確認。
//
// 它不顯示「幾台機器人在用」。要顯示那個數字，得為每一份各問一次機器人清單，
// 而它救不了任何一次操作：真的要刪的時候後端會擋下並說出數字。
//
// 「拼一份」在任何寬度都在：步驟卡在手機上也編得動，所以不必再因為螢幕窄而把那條路藏起來。
const { tradingStrategyApplication } = defineProps<{
  tradingStrategyApplication: TradingStrategyApplication
}>()

const tradingStrategies = useTradingStrategies(tradingStrategyApplication)

onMounted(() => {
  void tradingStrategies.load()
})
</script>

<template>
  <div class="trading-strategy-list">
    <header class="trading-strategy-list__toolbar">
      <!--
        拼好一份之後下一步是派一台機器人出去，所以那條路就擺在這裡。
        清單裡兩種交易策略都有，而現貨與合約機器人各住一頁，所以兩條路都擺。
      -->
      <AppButton
        to="/strategy-bots"
        variant="ghost"
        size="small"
        data-testid="trading-strategy-bots-link"
      >
        現貨機器人
      </AppButton>
      <AppButton
        to="/contract-strategy-bots"
        variant="ghost"
        size="small"
        data-testid="trading-strategy-contract-bots-link"
      >
        合約機器人
      </AppButton>
      <AppButton
        to="/trading-strategies/new"
        class="trading-strategy-list__create"
        data-testid="trading-strategy-create"
      >
        <AppIcon
          name="plus"
          size="small"
        />
        拼一份交易策略
      </AppButton>
    </header>

    <AppToast :message="tradingStrategies.announcement.value" />

    <AppAlert
      v-if="tradingStrategies.failureMessage.value !== ''"
      tone="danger"
      data-testid="trading-strategy-list-failure"
    >
      {{ tradingStrategies.failureMessage.value }}
      <template #action>
        <AppButton
          type="button"
          variant="ghost"
          data-testid="trading-strategy-list-retry"
          @click="tradingStrategies.load"
        >
          再試一次
        </AppButton>
      </template>
    </AppAlert>

    <p
      v-if="tradingStrategies.loading.value"
      class="trading-strategy-list__notice"
    >
      讀取中…
    </p>

    <!--
      讀不到與「一份都沒有」永遠分開講：一句要他再試一次，一句要他去拼一份。
      說成同一句，他會把一次連不上讀成自己什麼都沒有。
    -->
    <p
      v-else-if="tradingStrategies.failureMessage.value === ''
        && tradingStrategies.tradingStrategies.value.length === 0"
      class="trading-strategy-list__notice trading-strategy-list__notice--empty"
      data-testid="trading-strategy-list-empty"
    >
      還沒有任何交易策略。拼一份之後，就能讓好幾台機器人一起照它判斷。
    </p>

    <AppPanel
      v-else-if="tradingStrategies.tradingStrategies.value.length > 0"
      flush
    >
      <!-- 欄名只在排成一欄一欄的寬螢幕上有意義；疊成卡片時每一格自己說得出它是什麼。 -->
      <div
        class="trading-strategy-list__columns"
        aria-hidden="true"
      >
        <span>名稱</span>
        <span>行情 · 訊號來源</span>
        <span />
      </div>

      <ul class="trading-strategy-list__rows">
        <li
          v-for="tradingStrategy in tradingStrategies.tradingStrategies.value"
          :key="tradingStrategy.id"
          class="trading-strategy-list__row"
          data-testid="trading-strategy-row"
        >
          <span class="trading-strategy-list__name">{{ tradingStrategy.name }}</span>

          <span class="trading-strategy-list__meta">
            <AppBadge
              variant="neutral"
              data-testid="trading-strategy-market-data-kind"
            >{{ tradingStrategy.marketDataKindLabel }}</AppBadge>
            <AppBadge
              v-if="tradingStrategy.tradingModeLabel"
              variant="accent"
            >{{ tradingStrategy.tradingModeLabel }}</AppBadge>
            <span class="trading-strategy-list__count">{{ tradingStrategy.signalSources.length }} 支策略腳本</span>
          </span>

          <span class="trading-strategy-list__actions">
            <AppButton
              :to="`/trading-strategies/${tradingStrategy.id}`"
              variant="secondary"
              size="small"
              data-testid="trading-strategy-edit"
            >
              改一改
            </AppButton>
            <AppButton
              type="button"
              variant="danger-ghost"
              size="small"
              :disabled="tradingStrategies.busyId.value === tradingStrategy.id"
              data-testid="trading-strategy-delete"
              @click="tradingStrategies.askToDelete(tradingStrategy)"
            >
              刪掉
            </AppButton>
          </span>
        </li>
      </ul>
    </AppPanel>

    <!-- 刪除不可逆，而它是花時間拼出來的。 -->
    <ConfirmDialog
      :open="tradingStrategies.deleting.value !== null"
      title="刪掉這一份交易策略？"
      :message="`「${tradingStrategies.deleting.value?.name ?? ''}」刪掉就沒了。還有機器人在用它的話，這一步會被擋下來。`"
      confirm-label="刪掉"
      data-testid="trading-strategy-delete-confirm"
      @confirm="tradingStrategies.confirmDelete"
      @cancel="tradingStrategies.cancelDelete"
    />
  </div>
</template>

<style scoped lang="scss">
// 寬螢幕上一份一列、欄位對齊；手機上一份一張卡，名字在上、行情與來源在中、動作在下。
.trading-strategy-list {
  display: flex;
  flex-direction: column;
  gap: spacing('sm');

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__create {
    margin-left: auto;
  }

  &__notice {
    margin: 0;
    color: color('text-muted');
    font-size: font-size('sm');

    &--empty {
      border: 1px dashed color('border-strong');
      border-radius: radius('md');
      padding: spacing('xl') spacing('md');
      text-align: center;
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
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.4fr) auto;
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
    gap: spacing('2xs');
    border-bottom: 1px solid color('border');
    padding: spacing('sm') spacing('md');

    &:last-child {
      border-bottom: none;
    }

    @include respond-to('md') {
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1.4fr) auto;
      gap: spacing('sm');
      align-items: center;
    }
  }

  // 名字是這一列的身分，所以它最亮、比周圍大一階。
  &__name {
    overflow: hidden;
    color: color('text-strong');
    font-weight: font-weight('semibold');
    font-size: font-size('md');
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: spacing('2xs');
  }

  &__count {
    color: color('text-muted');
    font-size: font-size('xs');
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: spacing('2xs');
  }
}
</style>
